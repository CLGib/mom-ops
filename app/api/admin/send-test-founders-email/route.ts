import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getMemberDisplayNameForMacro } from "@/lib/member-display-name";
import { queueEmail } from "@/lib/email/queue";
import { sendOne } from "@/lib/email/send";

/**
 * Send a test copy of the founders launch (founding member welcome) email.
 * Admin-only. Body { "to_email": "you@example.com" } optional; defaults to current user's email.
 * Uses the logged-in admin's first name in the greeting when available.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (roleRow?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body: { to_email?: string } = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    // ignore
  }
  const toEmail =
    typeof body?.to_email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to_email)
      ? body.to_email
      : user.email;

  // Use admin's first name for test email greeting (profile, then auth metadata, then email)
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_name, full_name")
    .eq("id", user.id)
    .single();
  let memberName = profile
    ? getMemberDisplayNameForMacro(profile.preferred_name, profile.full_name)
    : "";
  if (!memberName || memberName === "Member") {
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const full =
      (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta?.name === "string" && meta.name.trim()) ||
      "";
    memberName = full ? full.trim().split(/\s+/)[0] : (user.email?.split("@")[0]?.replace(/[._0-9]+$/, "").slice(0, 30) || "there");
  }

  const dedupeKey = `test-founders-launch:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
  await queueEmail({
    to_email: toEmail,
    template: "founding_member_welcome_v1",
    payload: { member_name: memberName },
    dedupe_key: dedupeKey,
  });

  const serviceSupabase = createServiceClient(url, serviceKey);
  const { data: row } = await serviceSupabase
    .from("email_outbox")
    .select("id, to_email, template, payload, status, attempts, last_error")
    .eq("dedupe_key", dedupeKey)
    .single();

  if (!row) {
    return NextResponse.json(
      { error: "Failed to find queued test email" },
      { status: 500 }
    );
  }

  const result = await sendOne({
    id: row.id,
    to_email: row.to_email,
    template: row.template,
    payload: (row.payload as Record<string, unknown>) ?? {},
    status: row.status,
    attempts: row.attempts ?? 0,
    last_error: row.last_error,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to send test email", to_email: toEmail },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Test founders launch email sent to ${toEmail}`,
    to_email: toEmail,
  });
}
