/**
 * Server-only: queue "new task available" emails to all VAs who can claim tasks.
 * Call after a new unassigned ticket is created (member submit or recurring job).
 */
import { createClient } from "@supabase/supabase-js";
import { queueEmail } from "./queue";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL or service role key not set");
  return createClient(url, key);
}

/** Queue one va_new_task_available_v1 email per VA (onboarding + training complete). */
export async function notifyVAsNewTask(ticketId: string): Promise<{ queued: number }> {
  const supabase = getServiceSupabase();

  const { data: ticket, error: ticketErr } = await supabase
    .from("tickets")
    .select("id, subject, ticket_number")
    .eq("id", ticketId)
    .single();

  if (ticketErr || !ticket) {
    return { queued: 0 };
  }

  const subject = (ticket.subject && String(ticket.subject).trim()) || "";
  const ticketNumber = ticket.ticket_number ?? null;

  const { data: vaProfiles } = await supabase
    .from("va_profiles")
    .select("user_id")
    .eq("onboarding_complete", true)
    .eq("training_complete", true);

  const vaIds = (vaProfiles ?? []).map((p) => p.user_id).filter(Boolean);
  if (vaIds.length === 0) {
    return { queued: 0 };
  }

  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });

  const vaIdSet = new Set(vaIds);
  const vaEmailById: Record<string, string> = {};
  authUsers?.forEach((u) => {
    if (vaIdSet.has(u.id) && u.email?.trim()) {
      vaEmailById[u.id] = u.email.trim().toLowerCase();
    }
  });

  const payload = {
    ticket_id: ticketId,
    subject,
    ticket_number: ticketNumber,
  };

  let queued = 0;
  for (const vaId of Object.keys(vaEmailById)) {
    const email = vaEmailById[vaId];
    if (!email) continue;
    try {
      await queueEmail({
        to_email: email,
        template: "va_new_task_available_v1",
        payload: { ...payload },
        dedupe_key: `va_new_task:${ticketId}:${vaId}`,
      });
      queued++;
    } catch {
      // continue with rest
    }
  }

  return { queued };
}
