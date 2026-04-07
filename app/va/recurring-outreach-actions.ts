"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { VA_STALE_CHECKIN_DAYS } from "@/lib/va/recurring-outreach";

export async function logRecurringOutreachEvent(params: {
  memberId: string;
  note?: string;
  ticketId?: string;
}): Promise<{ error: string | null }> {
  const { memberId, note, ticketId } = params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (roleRow?.role !== "va") return { error: "Only VAs can log this." };

  let authorized = false;
  if (ticketId) {
    const { data: ticket } = await supabase
      .from("tickets")
      .select("member_id, assigned_va_id")
      .eq("id", ticketId)
      .single();
    if (ticket?.assigned_va_id === user.id && ticket.member_id === memberId) authorized = true;
  } else {
    const { data: bundle } = await supabase.rpc("va_get_member_context_for_checkin", {
      p_member_id: memberId,
      p_days: VA_STALE_CHECKIN_DAYS,
    });
    if (
      bundle &&
      typeof bundle === "object" &&
      (bundle as { profile?: unknown }).profile != null
    ) {
      authorized = true;
    }
  }

  if (!authorized) return { error: "You are not allowed to log outreach for this member here." };

  const trimmed = (note ?? "").trim();
  const { error } = await supabase.from("va_team_member_events").insert({
    member_id: memberId,
    event_type: "recurring_outreach",
    note_text: trimmed.length > 0 ? trimmed.slice(0, 500) : null,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/va/outreach/member/${memberId}`);
  revalidatePath("/va/outreach");
  if (ticketId) {
    revalidatePath(`/va/${ticketId}`);
    revalidatePath(`/va/${ticketId}/member-context`);
  }
  return { error: null };
}
