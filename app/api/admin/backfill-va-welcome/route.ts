import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { queueEmail } from "@/lib/email/queue";
import { sendOne } from "@/lib/email/send";

/**
 * One-time backfill: queue and send the VA welcome/onboarding email to all current VAs.
 * Admin-only. By default skips VAs who already received it (dedupe_key).
 * Body { "resend": true } uses a different dedupe key so each VA gets one more send.
 */
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
  if (roleRow?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const serviceSupabase = createServiceClient(url, serviceKey);

  const { data: profiles } = await serviceSupabase
    .from("profiles")
    .select("id")
    .eq("role", "va");
  const vaIds = (profiles ?? []).map((p) => p.id);
  if (vaIds.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No VAs found.",
      queued: 0,
      sent: 0,
      failed: 0,
    });
  }

  const { data: { users: authUsers } } = await serviceSupabase.auth.admin.listUsers({
    perPage: 1000,
  });
  const vaIdSet = new Set(vaIds);
  const vaEmails: string[] = [];
  authUsers?.forEach((u) => {
    if (vaIdSet.has(u.id) && u.email?.trim()) {
      vaEmails.push(u.email.trim().toLowerCase());
    }
  });

  let body: { resend?: boolean } = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    // ignore
  }
  const resend = body?.resend === true;
  const dedupePrefix = resend ? "va_welcome_resend:" : "va_welcome:";

  const bookingUrl = process.env.VA_TRAINING_BOOKING_URL || undefined;
  const payload = bookingUrl ? { booking_url: bookingUrl } : {};
  for (const email of vaEmails) {
    try {
      await queueEmail({
        to_email: email,
        template: "va_welcome_v1",
        payload: { ...payload },
        dedupe_key: `${dedupePrefix}${email}`,
      });
    } catch {
      // e.g. DB error; continue with rest
    }
  }

  const { data: rows } = await serviceSupabase
    .from("email_outbox")
    .select("id, to_email, template, payload, status, attempts, last_error")
    .eq("template", "va_welcome_v1")
    .eq("status", "queued");

  let sent = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    if (!row.to_email) continue;
    const result = await sendOne({
      id: row.id,
      to_email: row.to_email,
      template: row.template,
      payload: (row.payload as Record<string, unknown>) ?? {},
      status: row.status,
      attempts: row.attempts ?? 0,
      last_error: row.last_error,
    });
    if (result.ok) sent++;
    else failed++;
  }

  const skipNote = resend
    ? ""
    : " (VAs who already received it were skipped.)";
  return NextResponse.json({
    ok: true,
    message: `Backfill complete. ${sent} welcome emails sent, ${failed} failed.${skipNote}`,
    sent,
    failed,
    vaCount: vaEmails.length,
  });
}
