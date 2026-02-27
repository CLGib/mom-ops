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

const AUTH_DEBUG = process.env.NODE_ENV === "development" || process.env.DEBUG_AUTH === "1";

export async function createTicket(
  subject: string,
  description: string | null,
  accessToken?: string | null,
  requestedVaId?: string | null
): Promise<{ ticketId?: string; error?: string }> {
  try {
    let user: { id: string } | null = null;
    const token = accessToken?.trim();
    let bearerOk = false;
    let cookieOk = false;

    if (AUTH_DEBUG) {
      console.debug("[createTicket] auth input:", {
        tokenPassed: !!token,
        tokenLength: token?.length ?? 0,
      });
    }

    if (token) {
      const supabase = supabaseFromToken(token);
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        user = data.user;
        bearerOk = true;
      } else if (AUTH_DEBUG) {
        console.warn("[createTicket] bearer path:", {
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
      cookieOk = !!user;
    }
    if (!user) {
      if (AUTH_DEBUG) {
        console.warn("[createTicket] Not logged in:", {
          tokenPassed: !!token,
          tokenLength: token?.length ?? 0,
          bearerOk,
          cookieOk,
        });
      }
      return { error: "Not logged in." };
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return { error: "Server configuration error." };
    }

    const supabase = createClient(url, serviceKey);
    let allowedRequestedVaId: string | null = null;
    if (requestedVaId?.trim()) {
      const { data: workedWith } = await supabase
        .from("tickets")
        .select("assigned_va_id")
        .eq("member_id", user.id)
        .not("assigned_va_id", "is", null)
        .in("status", ["completed", "closed"]);
      const allowedVaIds = [...new Set((workedWith ?? []).map((r) => r.assigned_va_id!).filter(Boolean))];
      if (allowedVaIds.includes(requestedVaId.trim())) {
        allowedRequestedVaId = requestedVaId.trim();
      }
    }
    const insertPayload: {
      member_id: string;
      subject: string;
      description: string | null;
      status: string;
      requested_va_id?: string | null;
    } = {
      member_id: user.id,
      subject,
      description: description || null,
      status: "new",
    };
    if (allowedRequestedVaId) {
      insertPayload.requested_va_id = allowedRequestedVaId;
    }
    const { data: ticket, error } = await supabase
      .from("tickets")
      .insert(insertPayload)
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

export async function setRequestedVa(
  ticketId: string,
  vaId: string | null
): Promise<{ error?: string }> {
  try {
    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return { error: "Not logged in." };

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return { error: "Server configuration error." };

    const supabase = createClient(url, serviceKey);
    const { data: ticket } = await supabase
      .from("tickets")
      .select("member_id")
      .eq("id", ticketId)
      .single();
    if (!ticket || ticket.member_id !== user.id) {
      return { error: "Ticket not found or you are not the member." };
    }
    let finalVaId: string | null = vaId || null;
    if (finalVaId) {
      const { data: workedWith } = await supabase
        .from("tickets")
        .select("assigned_va_id")
        .eq("member_id", user.id)
        .not("assigned_va_id", "is", null)
        .in("status", ["completed", "closed"]);
      const allowedVaIds = [...new Set((workedWith ?? []).map((r) => r.assigned_va_id!).filter(Boolean))];
      if (!allowedVaIds.includes(finalVaId)) {
        return { error: "You can only request a specialist you have worked with before." };
      }
    }
    const { error } = await supabase
      .from("tickets")
      .update({ requested_va_id: finalVaId })
      .eq("id", ticketId);

    if (error) return { error: error.message };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function submitTicketReview(
  ticketId: string,
  rating: number,
  feedback: string | null
): Promise<{ error?: string }> {
  try {
    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return { error: "Not logged in." };

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return { error: "Please choose a rating from 1 to 5." };
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return { error: "Server configuration error." };

    const supabase = createClient(url, serviceKey);
    const { data: ticket } = await supabase
      .from("tickets")
      .select("member_id, status, rating")
      .eq("id", ticketId)
      .single();

    if (!ticket || ticket.member_id !== user.id) {
      return { error: "Task not found or you are not the member." };
    }
    if (ticket.status !== "completed" && ticket.status !== "closed") {
      return { error: "You can only rate a task that is completed or closed." };
    }
    if (ticket.rating != null) {
      return { error: "You have already submitted a review for this task." };
    }

    const { error } = await supabase
      .from("tickets")
      .update({
        rating,
        feedback: feedback?.trim() || null,
      })
      .eq("id", ticketId);

    if (error) return { error: error.message };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
