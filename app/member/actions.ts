"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

function supabaseFromToken(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

export async function createTicket(
  subject: string,
  description: string | null,
  accessToken?: string | null
): Promise<{ ticketId?: string; error?: string }> {
  try {
    let user: { id: string } | null = null;
    const token = accessToken?.trim();
    if (token) {
      const supabase = supabaseFromToken(token);
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        user = data.user;
      } else if (process.env.NODE_ENV === "development") {
        console.warn("[createTicket] token branch:", {
          hasError: !!error,
          errorMessage: error?.message,
          errorStatus: (error as { status?: number } | undefined)?.status,
          tokenPrefix: token.slice(0, 10) + "...",
        });
      }
    }
    if (!user) {
      const serverClient = await createServerClient();
      const { data } = await serverClient.auth.getUser();
      user = data.user ?? null;
    }
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
    if (id == null) {
      return { error: "Failed to create task." };
    }
    return { ticketId: String(id) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return { error: String(message) };
  }
}
