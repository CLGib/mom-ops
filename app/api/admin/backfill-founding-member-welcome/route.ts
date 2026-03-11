import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { queueEmail } from "@/lib/email/queue";
import { sendOne } from "@/lib/email/send";

/**
 * One-time backfill: queue and send the founding member welcome email to all current founding members.
 * Admin-only. By default skips members who already received it (dedupe_key).
 * Body { "resend": true } uses a different dedupe key so each member gets one more send.
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
    .eq("role", "member")
    .eq("is_founding_member", true);
  const founderIds = (profiles ?? []).map((p) => p.id);
  if (founderIds.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No founding members found.",
      queued: 0,
      sent: 0,
      failed: 0,
    });
  }

  let body: { resend?: boolean } = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    // ignore
  }
  const resend = body?.resend === true;
  const dedupePrefix = resend ? "founding_member_welcome_resend:" : "founding_member_welcome:";

  for (const memberId of founderIds) {
    try {
      await queueEmail({
        to_email: null,
        template: "founding_member_welcome_v1",
        payload: { member_id: memberId },
        dedupe_key: `${dedupePrefix}${memberId}`,
      });
    } catch {
      // e.g. DB error; continue with rest
    }
  }

  const { data: rows } = await serviceSupabase
    .from("email_outbox")
    .select("id, to_email, template, payload, status, attempts, last_error")
    .eq("template", "founding_member_welcome_v1")
    .eq("status", "queued");

  let sent = 0;
  let failed = 0;
  for (const row of rows ?? []) {
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
    : " (Members who already received it were skipped.)";
  return NextResponse.json({
    ok: true,
    message: `Backfill complete. ${sent} founding member welcome emails sent, ${failed} failed.${skipNote}`,
    sent,
    failed,
    founderCount: founderIds.length,
  });
}
