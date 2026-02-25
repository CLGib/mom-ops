/**
 * Server-only: enqueue an outbound email. Uses service role to insert into email_outbox.
 * On dedupe_key conflict we do nothing (idempotent).
 */
import { createClient } from "@supabase/supabase-js";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL or service role key not set");
  return createClient(url, key);
}

export type QueueEmailParams = {
  to_email?: string | null;
  template: string;
  payload: Record<string, unknown>;
  dedupe_key: string;
  send_after?: Date | null;
};

export async function queueEmail(params: QueueEmailParams): Promise<void> {
  const { to_email, template, payload, dedupe_key, send_after } = params;
  const supabase = getServiceSupabase();
  const { error } = await supabase.from("email_outbox").insert({
    to_email: to_email ?? null,
    template,
    payload: payload ?? {},
    dedupe_key,
    send_after: send_after?.toISOString() ?? null,
    status: "queued",
    attempts: 0,
  });
  if (error?.code === "23505") return; // unique violation = already queued, idempotent
  if (error) throw new Error(`email_outbox insert failed: ${error.message}`);
}
