import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VA_ONBOARDING_PROTOCOLS } from "@/lib/va-onboarding-protocols";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getTaskLibrary, findCreditsBySubject } from "@/lib/task-library";
import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_MODEL = (process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4");
const ANTHROPIC_FALLBACK_MODEL = process.env.ANTHROPIC_FALLBACK_MODEL?.trim() || "claude-3-5-haiku-20241022";

const OVERLOAD_MESSAGE = "The AI service is temporarily busy. Please try again in a minute.";

function isOverloadError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const o = err as { status?: number; message?: string; type?: string; error?: { type?: string; message?: string } };
  const status = o.status;
  const message = String(o.message ?? o.error?.message ?? "").toLowerCase();
  const type = String(o.type ?? o.error?.type ?? "").toLowerCase();
  return status === 529 || message.includes("overload") || type.includes("overload");
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const isOverload = isOverloadError(e);
      if (!isOverload || attempt === maxAttempts) throw e;
      const delayMs = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

/** Try primary model with retries; on overload (529), try fallback model. */
async function withRetryAndFallback<T>(
  create: (model: string) => Promise<T>,
  options?: { primaryAttempts?: number; fallbackAttempts?: number }
): Promise<T> {
  const primaryAttempts = options?.primaryAttempts ?? 5;
  const fallbackAttempts = options?.fallbackAttempts ?? 2;

  try {
    return await withRetry(() => create(ANTHROPIC_MODEL), primaryAttempts);
  } catch (e) {
    if (!isOverloadError(e) || !ANTHROPIC_FALLBACK_MODEL) throw e;
    return await withRetry(() => create(ANTHROPIC_FALLBACK_MODEL), fallbackAttempts);
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(user.id, RATE_LIMITS.vaAssistant);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  let body: { ticketId?: string; mode?: string; instructions?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const ticketId = typeof body.ticketId === "string" ? body.ticketId.trim() : "";
  const instructions =
    typeof body.instructions === "string" && body.instructions.trim()
      ? body.instructions.trim()
      : undefined;
  const mode =
    body.mode === "tips" || body.mode === "quickstart" || body.mode === "suggestCredit"
      ? body.mode
      : null;
  if (!ticketId || !mode) {
    return NextResponse.json(
      { error: "ticketId and mode (tips|quickstart|suggestCredit) are required" },
      { status: 400 }
    );
  }

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, subject, description, assigned_va_id")
    .eq("id", ticketId)
    .single();

  if (!ticket || ticket.assigned_va_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("sender_role, message, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  const { data: memberContextRows } = await supabase.rpc("get_va_member_context", {
    p_ticket_id: ticketId,
  });
  const memberContext = Array.isArray(memberContextRows) && memberContextRows.length > 0
    ? memberContextRows[0]
    : null;

  const { data: quizzesAndSurveys } = await supabase.rpc("get_va_member_quizzes_and_surveys", {
    p_ticket_id: ticketId,
  });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Assistant not configured" },
      { status: 503 }
    );
  }

  const anthropic = new Anthropic({ apiKey });

  const threadText =
    (messages ?? [])
      .map((m) => `[${m.sender_role ?? "?"}]: ${(m.message ?? "").replace(/\n/g, " ")}`)
      .join("\n") || "(no messages yet)";

  const memberText = memberContext
    ? JSON.stringify(memberContext).slice(0, 3000)
    : "(no member context)";

  const quizText = quizzesAndSurveys
    ? typeof quizzesAndSurveys === "object"
      ? JSON.stringify(quizzesAndSurveys).slice(0, 1500)
      : String(quizzesAndSurveys).slice(0, 1500)
    : "";

  const systemPrompt = `${VA_ONBOARDING_PROTOCOLS}

Use the member context and thread below only to personalize and reduce mental load. Focus on going one level above the ask.`;

  const userPrompt = `Task subject: ${ticket.subject}
${ticket.description ? `Task description:\n${ticket.description}` : ""}

Member context (profile, preferences): ${memberText}
${quizText ? `Quizzes/surveys (summary): ${quizText}` : ""}

Thread so far:
${threadText}${instructions ? `\n\nVA instructions / focus: ${instructions}` : ""}`;

  try {
    if (mode === "quickstart") {
      const quickstartInstruction = `Based on the task, thread, and member context above, produce a short quick-start guide for the VA to begin this task. Output a single JSON object with no other text before or after. Use exactly these keys:
- steps: array of 3-5 strings. Each string is one clear, scannable bullet: a single action or step in a short phrase or one sentence. No paragraphs.
- links: array of 0-5 objects with "label" and "url" (e.g. {"label": "Google Flights", "url": "https://www.google.com/flights"} or useful tools/templates; use real URLs where you know them, otherwise omit or use empty string for url)
- ideas: array of 2-4 strings. Each string is one short bullet: a single tip or idea in a phrase or one sentence. No paragraphs.

Example shape: {"steps":["Look up school district for the given zip","Check enrollment deadlines"],"links":[{"label":"Example","url":"https://example.com"}],"ideas":["Note any IEP or language needs from the details"]}`;
      const completion = await withRetryAndFallback((model) =>
        anthropic.messages.create({
          model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userPrompt + "\n\n" + quickstartInstruction,
            },
          ],
        })
      );

      const textBlock = completion.content.find((b) => b.type === "text");
      const raw = (textBlock && "text" in textBlock ? textBlock.text : "").trim() || "{}";
      let steps: string[] = [];
      let links: { label: string; url: string }[] = [];
      let ideas: string[] = [];
      try {
        const stripped = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
        const parsed = JSON.parse(stripped) as {
          steps?: unknown;
          links?: unknown;
          ideas?: unknown;
        };
        if (Array.isArray(parsed.steps)) {
          steps = parsed.steps
            .filter((s): s is string => typeof s === "string")
            .slice(0, 10);
        }
        if (Array.isArray(parsed.links)) {
          links = parsed.links
            .filter((l): l is { label?: string; url?: string } => l != null && typeof l === "object")
            .map((l) => ({
              label: typeof l.label === "string" ? l.label : "Link",
              url: typeof l.url === "string" && l.url.trim() ? l.url.trim() : "#",
            }))
            .slice(0, 10);
        }
        if (Array.isArray(parsed.ideas)) {
          ideas = parsed.ideas
            .filter((i): i is string => typeof i === "string")
            .slice(0, 10);
        }
      } catch {
        return NextResponse.json(
          { error: "Couldn't generate guide. Try again or start from the task description." },
          { status: 502 }
        );
      }
      if (steps.length === 0) {
        steps = ["Review the task and member context above.", "Gather any needed details or links.", "Draft your first reply or deliverable."];
      }
      return NextResponse.json({ steps, links, ideas });
    }

    if (mode === "suggestCredit") {
      const taskLibrary = await getTaskLibrary();
      const libraryMatch = findCreditsBySubject(taskLibrary, ticket.subject);
      const librarySummary =
        taskLibrary.length > 0
          ? taskLibrary
              .slice(0, 80)
              .map((t) => `"${t.task}": ${t.credits}`)
              .join(", ") + (taskLibrary.length > 80 ? " (and more)" : "")
          : "(no task library)";

      const suggestInstruction = `You are helping a VA set the credit cost for this task. Use the task library and ticket scope to suggest a non-negative integer number of credits.

Task library (task name → credits): ${librarySummary}
${libraryMatch != null ? `Direct library match for this subject: ${libraryMatch} credits.` : "No exact library match for this subject."}

Output a single JSON object with no other text before or after. Use exactly these keys:
- suggestedCredit: number (non-negative integer; use library match or closest similar task as reference; suggest a different number only if scope clearly differs)
- reason: string (optional, one short sentence explaining the suggestion)

Example: {"suggestedCredit":3,"reason":"Matches standard research task in library."}`;

      const completion = await withRetryAndFallback((model) =>
        anthropic.messages.create({
          model,
          max_tokens: 256,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userPrompt + "\n\n" + suggestInstruction,
            },
          ],
        })
      );

      const textBlock = completion.content.find((b) => b.type === "text");
      const raw = (textBlock && "text" in textBlock ? textBlock.text : "").trim() || "{}";
      let suggestedCredit: number;
      let reason: string | undefined;
      try {
        const stripped = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
        const parsed = JSON.parse(stripped) as { suggestedCredit?: unknown; reason?: unknown };
        const n = typeof parsed.suggestedCredit === "number" ? parsed.suggestedCredit : parseInt(String(parsed.suggestedCredit ?? ""), 10);
        if (!Number.isInteger(n) || n < 0) {
          return NextResponse.json(
            { error: "Invalid suggestion. Could not parse a non-negative integer credit cost." },
            { status: 502 }
          );
        }
        suggestedCredit = n;
        reason = typeof parsed.reason === "string" && parsed.reason.trim() ? parsed.reason.trim().slice(0, 500) : undefined;
      } catch {
        return NextResponse.json(
          { error: "Couldn't generate credit suggestion. Try again or set cost manually." },
          { status: 502 }
        );
      }
      return NextResponse.json({ suggestedCredit, reason });
    }

    // mode === "tips"
    const tipsInstruction =
      "List 3-5 concrete ideas for how the VA can go one step further on this task: anticipate the member's next need, add value beyond the minimum, reduce mental load. Return a JSON array of strings only. Each string must be one short, scannable bullet: a single clear idea in a phrase or one sentence. No paragraphs or long blocks. Example: [\"Check school district boundaries for the new zip\", \"Suggest 2–3 backup dates if enrollment is full\"] with no other text.";
    const completion = await withRetryAndFallback((model) =>
      anthropic.messages.create({
        model,
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt + "\n\n" + tipsInstruction }],
      })
    );

    const textBlock = completion.content.find((b) => b.type === "text");
    const raw = (textBlock && "text" in textBlock ? textBlock.text : "").trim() || "[]";
    let tips: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        tips = parsed.filter((t): t is string => typeof t === "string").slice(0, 10);
      }
    } catch {
      tips = raw.split(/\n+/).filter((s) => s.trim().length > 0).slice(0, 10);
    }
    if (tips.length === 0) tips = ["Review member context and think: what would she need next?"];

    return NextResponse.json({ tips });
  } catch (err) {
    if (isOverloadError(err)) {
      return NextResponse.json({ error: OVERLOAD_MESSAGE }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Assistant error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
