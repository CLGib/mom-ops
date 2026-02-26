"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function createTicket(
  subject: string,
  description: string | null
): Promise<{ ticketId?: string; error?: string }> {
  try {
    const serverClient = await createServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();
    if (!user) {
      return { error: "Not logged in." };
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return { error: "Server configuration error." };
    }

    const supabase = createClient(url, serviceKey);
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
    const id = ticket?.id;
    if (!id || typeof id !== "string") {
      return { error: "Failed to create task." };
    }
    return { ticketId: id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return { error: message };
  }
}
