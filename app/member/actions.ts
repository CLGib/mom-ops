"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { notifyVAsNewTask } from "@/lib/email/notify-vas-new-task";

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
  creditCost?: number,
  noRush?: boolean
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
    const { data: memberProfile } = await supabase
      .from("profiles")
      .select("is_free_trial")
      .eq("id", user.id)
      .single();
    const isFreeTrialTask = memberProfile?.is_free_trial === true;

    const { count: existingTicketCount } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("member_id", user.id);
    const isMemberFirstTask = (existingTicketCount ?? 0) === 0;

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
      no_rush?: boolean;
      is_free_trial_task?: boolean;
      is_member_first_task?: boolean;
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
    if (noRush === true) {
      insertPayload.no_rush = true;
    }
    if (isFreeTrialTask) {
      insertPayload.is_free_trial_task = true;
    }
    if (isMemberFirstTask) {
      insertPayload.is_member_first_task = true;
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
    try {
      await notifyVAsNewTask(String(id));
    } catch {
      // best-effort: don't fail ticket creation if VA notify fails
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
): Promise<{ error?: string } | { rating: number; hadWrittenReview: boolean }> {
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
      .select("member_id, status, rating, subject, assigned_va_id, category, ticket_number")
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

    const { error: creditError } = await supabase.from("credit_transactions").insert({
      member_id: user.id,
      ticket_id: ticketId,
      amount: 2,
      type: "survey_reward",
    });
    if (creditError) return { error: creditError.message };

    if (rating < 4) {
      try {
        const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL;
        let toEmail: string | null = adminAlertEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminAlertEmail) ? adminAlertEmail : null;
        if (!toEmail) {
          const { data: adminRows } = await supabase.from("admins").select("user_id").limit(1);
          if (adminRows?.[0]?.user_id) {
            const { data: adminData } = await supabase.auth.admin.getUserById(adminRows[0].user_id);
            const email = adminData?.user?.email;
            if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) toEmail = email;
          }
        }
        if (toEmail) {
          const { queueEmail } = await import("@/lib/email/queue");
          await queueEmail({
            to_email: toEmail,
            template: "low_rating_alert_v1",
            payload: {
              ticket_id: ticketId,
              subject: taskSubject,
              rating,
              feedback: feedback?.trim() || null,
              ticket_number: (ticket as { ticket_number?: number | null }).ticket_number ?? null,
            },
            dedupe_key: `low_rating:${ticketId}`,
          });
        }
      } catch (e) {
        console.warn("[submitTicketReview] low-rating admin email queue failed", e);
      }
    }

    return { rating, hadWrittenReview: !!(feedback?.trim()) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function approveTask(ticketId: string): Promise<{ error?: string }> {
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
      .select("member_id, status")
      .eq("id", ticketId)
      .single();

    if (!ticket || ticket.member_id !== user.id) {
      return { error: "Task not found or you are not the member." };
    }
    if (ticket.status !== "awaiting_member_approval") {
      return { error: "This task is not waiting for your approval." };
    }

    const { error } = await supabase
      .from("tickets")
      .update({ status: "completed" })
      .eq("id", ticketId);

    if (error) return { error: error.message };
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

    const { data: updated, error } = await serverClient
      .from("profiles")
      .update(payload)
      .eq("id", user.id)
      .select("avatar_url")
      .single();

    if (error) return { error: error.message };
    // If we tried to set avatar_url but no row was updated (e.g. RLS), surface a clear error
    if (payload.avatar_url != null && updated?.avatar_url !== payload.avatar_url) {
      return { error: "Profile update did not save. Please try again." };
    }
    // One-time 5-credit bonus for adding profile photo after first task (idempotent)
    if (Object.hasOwn(payload, "avatar_url") && updated?.avatar_url) {
      await serverClient.rpc("maybe_grant_profile_photo_bonus", { p_member_id: user.id });
    }
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

// ---- Recurring tasks ----

export type RecurringTaskForm = {
  task_library_id: string | null;
  subject: string | null;
  description_template: string | null;
  schedule_type: "weekly";
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  context_notes: string | null;
  credit_cost: number | null;
};

export async function createRecurringTask(
  form: RecurringTaskForm
): Promise<{ id?: string; error?: string }> {
  try {
    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return { error: "Not logged in." };

    const subject = (form.subject ?? "").trim() || null;
    const hasLibrary = form.task_library_id != null && form.task_library_id.trim() !== "";
    if (!hasLibrary && !subject) return { error: "Choose a task from the library or enter a custom subject." };

    const scheduleConfig = { day_of_week: form.day_of_week };
    const insertPayload = {
      member_id: user.id,
      task_library_id: hasLibrary ? form.task_library_id!.trim() : null,
      subject: hasLibrary ? null : subject,
      description_template: (form.description_template ?? "").trim() || null,
      schedule_type: "weekly",
      schedule_config: scheduleConfig,
      context_notes: (form.context_notes ?? "").trim() || null,
      credit_cost: form.credit_cost != null && Number.isInteger(form.credit_cost) && form.credit_cost >= 0 ? form.credit_cost : null,
      is_active: true,
    };

    const { data: row, error } = await serverClient
      .from("member_recurring_tasks")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) return { error: error.message };
    return { id: row?.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function updateRecurringTask(
  id: string,
  form: RecurringTaskForm
): Promise<{ error?: string }> {
  try {
    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return { error: "Not logged in." };

    const subject = (form.subject ?? "").trim() || null;
    const hasLibrary = form.task_library_id != null && form.task_library_id.trim() !== "";
    if (!hasLibrary && !subject) return { error: "Choose a task from the library or enter a custom subject." };

    const scheduleConfig = { day_of_week: form.day_of_week };
    const updatePayload = {
      task_library_id: hasLibrary ? form.task_library_id!.trim() : null,
      subject: hasLibrary ? null : subject,
      description_template: (form.description_template ?? "").trim() || null,
      schedule_config: scheduleConfig,
      context_notes: (form.context_notes ?? "").trim() || null,
      credit_cost: form.credit_cost != null && Number.isInteger(form.credit_cost) && form.credit_cost >= 0 ? form.credit_cost : null,
    };

    const { error } = await serverClient
      .from("member_recurring_tasks")
      .update(updatePayload)
      .eq("id", id)
      .eq("member_id", user.id);

    if (error) return { error: error.message };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function deleteRecurringTask(id: string): Promise<{ error?: string }> {
  try {
    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return { error: "Not logged in." };

    const { error } = await serverClient
      .from("member_recurring_tasks")
      .delete()
      .eq("id", id)
      .eq("member_id", user.id);

    if (error) return { error: error.message };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function setRecurringTaskActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  try {
    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return { error: "Not logged in." };

    const { error } = await serverClient
      .from("member_recurring_tasks")
      .update({ is_active: isActive })
      .eq("id", id)
      .eq("member_id", user.id);

    if (error) return { error: error.message };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
