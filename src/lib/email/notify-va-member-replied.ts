/**
 * Server-only: queue an email to the assigned VA when a member replies on a task.
 */
import { createClient } from "@supabase/supabase-js";
import { queueEmail } from "./queue";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL or service role key not set");
  return createClient(url, key);
}

export async function notifyVaMemberReplied(params: {
  ticketId: string;
  messageId: string;
  messageBody?: string | null;
}): Promise<{ queued: boolean }> {
  const supabase = getServiceSupabase();
  const { data: ticket, error: ticketErr } = await supabase
    .from("tickets")
    .select("assigned_va_id, subject, ticket_number")
    .eq("id", params.ticketId)
    .single();

  if (ticketErr || !ticket?.assigned_va_id) {
    return { queued: false };
  }

  const { data: authData } = await supabase.auth.admin.getUserById(ticket.assigned_va_id);
  const email = authData?.user?.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { queued: false };
  }

  const subject = (ticket.subject && String(ticket.subject).trim()) || "";
  const body =
    typeof params.messageBody === "string" && params.messageBody.trim()
      ? params.messageBody.trim()
      : "";

  try {
    await queueEmail({
      to_email: email,
      template: "va_member_replied_v1",
      payload: {
        ticket_id: params.ticketId,
        subject,
        ticket_number: ticket.ticket_number ?? null,
        message_body: body,
      },
      dedupe_key: `va_member_replied:${params.messageId}`,
    });
  } catch {
    return { queued: false };
  }

  return { queued: true };
}
