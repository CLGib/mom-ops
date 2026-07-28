import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { getTaskLibrary } from "@/lib/task-library";
import { getSimilarTasksBySubject } from "@/lib/suggested-tasks";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { queueEmail } from "@/lib/email/queue";

/**
 * Core AI fulfillment: take an existing (unfulfilled) ticket, generate a finished
 * deliverable with Claude, post it as an assistant thread message, and mark the
 * ticket completed with credit_cost 0 (AI is included in the flat plan, so the
 * completion trigger charges nothing).
 *
 * Shared by the /api/tasks/fulfill route (freeform tasks) and the one-click
 * helper flow (bringInHelper). Callers own their own auth / rate-limit /
 * subscription gating; this function only verifies ticket ownership.
 */

const ASSISTANT_ROLE = "assistant";

const SYSTEM_PROMPT = `You are the Mom Ops assistant — a warm, sharp, genuinely helpful teammate who takes tasks off a busy mom's plate.

You are handed a task. Your job is to DO IT and hand back a finished deliverable she can use right now — not a plan for how she could do it herself, not a list of questions.

How to work:
- Actually produce the thing. If she asks for a meal plan, write the meal plan AND the grocery list. If she asks for birthday party ideas, give a real plan: theme, a simple timeline, a shopping list, and 2-3 activity ideas. If she asks you to research options, give specific named options with the trade-offs so she can just decide.
- Go one level above the ask. Anticipate the obvious next need and include it.
- Be decisive. Make reasonable assumptions rather than asking her to fill in blanks. If you truly must assume something, state the assumption in one short line so she can adjust.
- Keep it warm and scannable. Short sections with bolded mini-headings, tight bullet lists. No filler, no throat-clearing, no "as an AI".
- When part of the task genuinely requires a phone call, a booking, a purchase, or showing up somewhere in the real world, do everything up to that point (draft the script, find the number, line up the options) and clearly note that a human on the Mom Ops team can take it the rest of the way.

OUTPUT FORMAT — strict:
- Return ONLY HTML. No markdown, no code fences, no commentary before or after.
- Use ONLY these tags: <p>, <ul>, <ol>, <li>, <strong>, <em>, <a href="...">, <br/>.
- There are NO heading tags available. For a section heading, use <p><strong>Heading</strong></p>.
- Start with one short, warm line acknowledging what you did. Then the deliverable. End with a short "Want a human to take this further?" line only if the task has a real-world action step.`;

type MemberProfile = Record<string, unknown> | null;

function buildUserPrompt(
  subject: string,
  description: string | null,
  profile: MemberProfile,
  templateHint: string | null,
): string {
  const profileText = profile ? JSON.stringify(profile).slice(0, 2500) : "(no profile on file)";
  return [
    `Task: ${subject}`,
    description ? `Details from the member:\n${description}` : "",
    `\nWhat we know about her (use to personalize; never invent facts that contradict this): ${profileText}`,
    templateHint
      ? `\nInternal reference — how our team usually approaches a similar task (a scaffold, not a script; adapt freely):\n${templateHint.slice(0, 1500)}`
      : "",
    `\nNow produce the finished deliverable as HTML per the format rules.`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function notifyAdminOfFailure(
  service: SupabaseClient,
  ticketId: string,
  subject: string,
): Promise<void> {
  try {
    const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL;
    let toEmail: string | null =
      adminAlertEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminAlertEmail) ? adminAlertEmail : null;
    if (!toEmail) {
      const { data: adminRows } = await service.from("admins").select("user_id").limit(1);
      if (adminRows?.[0]?.user_id) {
        const { data: adminData } = await service.auth.admin.getUserById(adminRows[0].user_id);
        const email = adminData?.user?.email;
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) toEmail = email;
      }
    }
    if (toEmail) {
      await queueEmail({
        to_email: toEmail,
        template: "ai_fulfill_failed_v1",
        payload: { ticket_id: ticketId, subject },
        dedupe_key: `ai_fulfill_failed:${ticketId}`,
      });
    }
  } catch (e) {
    console.warn("[fulfillTicket] admin failure notify failed", e);
  }
}

export type FulfillResult = {
  ok: boolean;
  error?: string;
  alreadyFulfilled?: boolean;
};

export async function fulfillTicket(ticketId: string, memberId: string): Promise<FulfillResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "AI not configured" };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { ok: false, error: "Server configuration error." };
  const service = createServiceClient(url, serviceKey);

  const { data: ticket } = await service
    .from("tickets")
    .select("id, member_id, subject, description, status, ai_generated, category")
    .eq("id", ticketId)
    .single();
  if (!ticket || ticket.member_id !== memberId) {
    return { ok: false, error: "Task not found." };
  }
  if (ticket.ai_generated) {
    return { ok: true, alreadyFulfilled: true };
  }

  const { data: profile } = await service
    .from("profiles")
    .select(
      "preferred_name, full_name, city, state, timezone, partner_name, kids_count, kids_ages, household_members, diet_notes, custom_field_values",
    )
    .eq("id", memberId)
    .single();

  let templateHint: string | null = null;
  try {
    const library = await getTaskLibrary();
    const matches = getSimilarTasksBySubject(ticket.subject ?? "", library, { limit: 1 });
    templateHint = matches[0]?.template?.trim() || null;
  } catch {
    templateHint = null;
  }

  const userPrompt = buildUserPrompt(
    ticket.subject ?? "",
    ticket.description ?? null,
    profile ?? null,
    templateHint,
  );

  let deliverableHtml = "";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4",
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[fulfillTicket] Anthropic error", res.status, errText.slice(0, 500));
      throw new Error("AI request failed");
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const block = data.content?.find((c) => c.type === "text");
    const raw = (block?.text ?? "").trim();
    const unfenced = raw.replace(/^```(?:html)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    deliverableHtml = sanitizeHtml(unfenced).trim();
    if (!deliverableHtml || deliverableHtml.replace(/<[^>]*>/g, "").trim().length < 20) {
      throw new Error("AI produced no usable deliverable");
    }
  } catch (e) {
    console.error("[fulfillTicket] generation failed", e);
    await notifyAdminOfFailure(service, ticketId, ticket.subject ?? "Task");
    return {
      ok: false,
      error:
        "Our assistant couldn't finish this one automatically. We've flagged it and will follow up shortly.",
    };
  }

  const { error: msgError } = await service.from("ticket_messages").insert({
    ticket_id: ticketId,
    sender_id: null,
    sender_role: ASSISTANT_ROLE,
    message: deliverableHtml,
    visible_to_member: true,
    internal: false,
  });
  if (msgError) {
    console.error("[fulfillTicket] message insert failed", msgError);
    await notifyAdminOfFailure(service, ticketId, ticket.subject ?? "Task");
    return { ok: false, error: "We generated your deliverable but couldn't save it. Please try again." };
  }

  const nowIso = new Date().toISOString();
  const { error: updError } = await service
    .from("tickets")
    .update({
      status: "completed",
      credit_cost: 0,
      ai_generated: true,
      ai_fulfilled_at: nowIso,
      completed_at: nowIso,
    })
    .eq("id", ticketId);
  if (updError) {
    console.error("[fulfillTicket] ticket update failed", updError);
    // Deliverable is posted; report success so the member still sees it.
  }

  return { ok: true };
}
