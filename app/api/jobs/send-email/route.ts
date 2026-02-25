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

/** Secured by CRON_SECRET. Vercel Cron sends Authorization: Bearer <CRON_SECRET>. */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // allow when not configured (e.g. local dev)
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
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
