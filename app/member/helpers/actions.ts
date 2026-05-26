"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { getTaskByFromTaskParam } from "@/lib/task-library";
import { fillTaskTemplate } from "@/lib/fill-task-template";
import { createTicket } from "../actions";

/**
 * One-click helper invocation.
 *
 * Looks up the requested helper from the task library, fills its template
 * with whatever profile context we already have on file, creates a ticket
 * via the existing createTicket() machinery (which also notifies the VA
 * team), and tags the new ticket with helper_id for team-side filtering.
 *
 * Returns the ticket id so the client can navigate to the confirmation
 * screen at /member/helpers/{ticketId}/sent.
 */
export async function bringInHelper(
  helperId: string,
): Promise<{ ticketId?: string; helperName?: string; error?: string }> {
  try {
    if (!helperId || typeof helperId !== "string") {
      return { error: "No helper specified." };
    }

    const serverClient = await createServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();
    if (!user) {
      return { error: "Not signed in." };
    }

    const helper = await getTaskByFromTaskParam(helperId);
    if (!helper) {
      return { error: "Helper not found." };
    }

    // Pull the same profile shape /member/page.tsx pulls so fillTaskTemplate
    // has every field it knows how to substitute.
    const { data: profile } = await serverClient
      .from("profiles")
      .select(
        "preferred_name, full_name, city, state, timezone, partner_name, kids_count, kids_ages, household_members, diet_notes, custom_field_values",
      )
      .eq("id", user.id)
      .single();

    const filledDescription = helper.template
      ? fillTaskTemplate(helper.template, profile ?? {})
      : null;
    const subject = `Helper: ${helper.task}`;

    // createTicket uses cookie-based auth (we just verified user), passes
    // null for accessToken so it falls back to the server client.
    const result = await createTicket(
      subject,
      filledDescription,
      null,
      null,
      null,
      helper.category ?? null,
    );

    if (result.error || !result.ticketId) {
      return { error: result.error ?? "Failed to bring in helper." };
    }

    // Tag the ticket with the helper id so the team can see in /va/tasks
    // (and we can do analytics later). Uses the service role since this
    // is an internal marker, not member-writable.
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && serviceKey) {
        const service = createClient(url, serviceKey);
        await service
          .from("tickets")
          .update({ helper_id: helper.id })
          .eq("id", result.ticketId);
      }
    } catch (err) {
      // Best-effort. The ticket exists either way; this just loses the
      // helper-id tag for analytics.
      console.warn("[bringInHelper] failed to tag helper_id", err);
    }

    return { ticketId: result.ticketId, helperName: helper.task };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong.";
    return { error: String(message) };
  }
}
