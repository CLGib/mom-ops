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

// Only enable in development; never in production to avoid logging tokens/session data
const AUTH_DEBUG = process.env.NODE_ENV === "development" && process.env.DEBUG_AUTH !== "0";

export async function createTicket(
  subject: string,
  description: string | null,
  accessToken?: string | null,
  requestedVaId?: string | null,
  fromReviewId?: string | null,
  category?: string | null,
  fromSpecialistProfile?: boolean,
  creditCost?: number
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
      const trimmed = requestedVaId.trim();
      if (fromReviewId?.trim()) {
        const { data: review } = await supabase
          .from("task_reviews")
          .select("va_id, visibility, is_hidden")
          .eq("id", fromReviewId.trim())
          .single();
        if (review?.visibility === "public" && !review.is_hidden && review.va_id === trimmed) {
          allowedRequestedVaId = trimmed;
        }
      }
      if (!allowedRequestedVaId && fromSpecialistProfile) {
        const { data: vaRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", trimmed)
          .single();
        if (vaRole?.role === "va") {
          allowedRequestedVaId = trimmed;
        }
      }
      if (!allowedRequestedVaId) {
        const { data: workedWith } = await supabase
          .from("tickets")
          .select("assigned_va_id")
          .eq("member_id", user.id)
          .not("assigned_va_id", "is", null)
          .in("status", ["completed", "closed"]);
        const allowedVaIds = [...new Set((workedWith ?? []).map((r) => r.assigned_va_id!).filter(Boolean))];
        if (allowedVaIds.includes(trimmed)) {
          allowedRequestedVaId = trimmed;
        }
      }
    }
    const insertPayload: {
      member_id: string;
      subject: string;
      description: string | null;
      status: string;
      requested_va_id?: string | null;
      category?: string | null;
      source_review_id?: string | null;
      created_from_review?: boolean;
      credit_cost?: number | null;
    } = {
      member_id: user.id,
      subject,
      description: description || null,
      status: "new",
    };
    if (allowedRequestedVaId) {
      insertPayload.requested_va_id = allowedRequestedVaId;
    }
    if (category?.trim()) {
      insertPayload.category = category.trim();
    }
    if (fromReviewId?.trim()) {
      insertPayload.source_review_id = fromReviewId.trim();
      insertPayload.created_from_review = true;
    }
    if (creditCost != null && Number.isInteger(creditCost) && creditCost >= 0) {
      insertPayload.credit_cost = creditCost;
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
  feedback: string | null,
  visibility: "private" | "public" = "private"
): Promise<{ error?: string }> {
  try {
    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return { error: "Not logged in." };

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return { error: "Please choose a rating from 1 to 5." };
    }
    if (visibility !== "private" && visibility !== "public") {
      return { error: "Invalid visibility." };
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return { error: "Server configuration error." };

    const supabase = createClient(url, serviceKey);
    const { data: ticket } = await supabase
      .from("tickets")
      .select("member_id, status, rating, subject, assigned_va_id, category")
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

    const taskSubject = (ticket.subject && String(ticket.subject).trim()) || "Task";

    const { error: ticketError } = await supabase
      .from("tickets")
      .update({
        rating,
        feedback: feedback?.trim() || null,
      })
      .eq("id", ticketId);

    if (ticketError) return { error: ticketError.message };

    const { error: reviewError } = await supabase.from("task_reviews").insert({
      task_id: ticketId,
      member_id: user.id,
      va_id: ticket.assigned_va_id ?? null,
      task_subject: taskSubject,
      rating,
      comment: feedback?.trim() || null,
      visibility,
      category: (ticket as { category?: string | null }).category ?? null,
    });

    if (reviewError) return { error: reviewError.message };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function updateTaskReview(
  reviewId: string,
  updates: { comment?: string | null; visibility?: "private" | "public" }
): Promise<{ error?: string }> {
  try {
    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return { error: "Not logged in." };

    const { comment, visibility } = updates;
    if (visibility !== undefined && visibility !== "private" && visibility !== "public") {
      return { error: "Invalid visibility." };
    }

    const supabase = await createServerClient();
    const { data: review } = await supabase
      .from("task_reviews")
      .select("member_id")
      .eq("id", reviewId)
      .single();

    if (!review || review.member_id !== user.id) {
      return { error: "Review not found or you can't edit it." };
    }

    const payload: { comment?: string | null; visibility?: "private" | "public" } = {};
    if (comment !== undefined) payload.comment = comment?.trim() || null;
    if (visibility !== undefined) payload.visibility = visibility;

    if (Object.keys(payload).length === 0) return {};

    const { error } = await supabase
      .from("task_reviews")
      .update(payload)
      .eq("id", reviewId)
      .eq("member_id", user.id);

    if (error) return { error: error.message };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function deleteTaskReview(reviewId: string): Promise<{ error?: string }> {
  try {
    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return { error: "Not logged in." };

    const supabase = await createServerClient();
    const { data: review } = await supabase
      .from("task_reviews")
      .select("member_id")
      .eq("id", reviewId)
      .single();

    if (!review || review.member_id !== user.id) {
      return { error: "Review not found or you can't delete it." };
    }

    const { error } = await supabase
      .from("task_reviews")
      .delete()
      .eq("id", reviewId)
      .eq("member_id", user.id);

    if (error) return { error: error.message };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/** Update current user's profile (name, display name, avatar). Available to all authenticated users. */
export async function updateMemberPublicProfile(updates: {
  full_name?: string | null;
  preferred_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}): Promise<{ error?: string }> {
  try {
    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return { error: "Not logged in." };

    const payload: Record<string, string | null> = {};
    if (Object.hasOwn(updates, "full_name")) payload.full_name = updates.full_name?.trim() || null;
    if (Object.hasOwn(updates, "preferred_name")) payload.preferred_name = updates.preferred_name?.trim() || null;
    if (Object.hasOwn(updates, "display_name")) payload.display_name = updates.display_name?.trim() || null;
    if (Object.hasOwn(updates, "avatar_url")) payload.avatar_url = updates.avatar_url ?? null;
    if (Object.keys(payload).length === 0) return {};

    const { error } = await serverClient
      .from("profiles")
      .update(payload)
      .eq("id", user.id);

    if (error) return { error: error.message };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
