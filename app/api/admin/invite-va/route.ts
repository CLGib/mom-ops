import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { queueEmail } from "@/lib/email/queue";
import { sendOne } from "@/lib/email/send";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  const role = roleRow?.role ?? null;
  const isAdmin = role === "admin";
  const isDirector = role === "director";
  if (!isAdmin && !isDirector) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const serviceSupabase = createServiceClient(url, serviceKey);

  const { data: inviteData, error: inviteError } = await serviceSupabase.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/auth/callback`,
    }
  );

  if (inviteError) {
    return NextResponse.json(
      { error: inviteError.message || "Failed to send invite" },
      { status: 400 }
    );
  }

  const invitedUserId = inviteData?.user?.id;
  if (invitedUserId) {
    await serviceSupabase
      .from("profiles")
      .update({ role: "va" })
      .eq("id", invitedUserId);
    if (isDirector) {
      await serviceSupabase.from("va_invites").upsert(
        { invited_by: user.id, va_id: invitedUserId },
        { onConflict: "va_id" }
      );
    }
  }

  // Send VA welcome/onboarding email (Resend) in addition to Supabase invite
  const bookingUrl = process.env.VA_TRAINING_BOOKING_URL || undefined;
  try {
    await queueEmail({
      to_email: email,
      template: "va_welcome_v1",
      payload: bookingUrl ? { booking_url: bookingUrl } : {},
      dedupe_key: `va_welcome:${email}`,
    });
  } catch (e) {
    // Don't fail the invite if welcome email fails; cron can retry
    console.error("[invite-va] Queue welcome email failed:", e);
  }

  const { data: outboxRow } = await serviceSupabase
    .from("email_outbox")
    .select("id, to_email, template, payload, status, attempts, last_error")
    .eq("dedupe_key", `va_welcome:${email}`)
    .eq("status", "queued")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (outboxRow) {
    const result = await sendOne({
      id: outboxRow.id,
      to_email: outboxRow.to_email,
      template: outboxRow.template,
      payload: (outboxRow.payload as Record<string, unknown>) ?? {},
      status: outboxRow.status,
      attempts: outboxRow.attempts ?? 0,
      last_error: outboxRow.last_error,
    });
    if (!result.ok) {
      console.error("[invite-va] Welcome email send failed:", result.error);
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Magic link and welcome email sent. VA can sign in from the email link.",
    userId: invitedUserId,
  });
}
