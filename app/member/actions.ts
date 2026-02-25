"use server";

import { createClient } from "@/lib/supabase/server";

export async function createTicket(
  subject: string,
  description: string | null
): Promise<{ ticketId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not logged in." };
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      member_id: user.id,
      subject,
      description: description || null,
      status: "new",
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }
  if (!ticket?.id) {
    return { error: "Failed to create task." };
  }
  return { ticketId: ticket.id };
}
