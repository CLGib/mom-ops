import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendOne } from "@/lib/email/send";

const BATCH_SIZE = 20;

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL or service role key not set");
  return createClient(url, key);
}

/** In production, CRON_SECRET must be set and request must send Authorization: Bearer <CRON_SECRET>. In development, allow when secret is unset for local/cron compatibility. */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !secret) return false; // production must have CRON_SECRET configured
  if (!secret) return true; // development: no secret → allow (e.g. local cron)
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !secret) {
    return NextResponse.json(
      { error: "Cron job not configured: set CRON_SECRET in production." },
      { status: 503 }
    );
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const now = new Date().toISOString();

  const { data: rows, error } = await supabase
    .from("email_outbox")
    .select("id, to_email, template, payload, status, attempts, last_error")
    .eq("status", "queued")
    .or(`send_after.is.null,send_after.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json(
      { error: error.message, sent: 0, failed: 0 },
      { status: 500 }
    );
  }

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

  return NextResponse.json({
    ok: true,
    processed: (rows ?? []).length,
    sent,
    failed,
  });
}
