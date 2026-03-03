import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VA_ONBOARDING_PROTOCOLS } from "@/lib/va-onboarding-protocols";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_MODEL = (process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4");

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

  let body: { ticketId?: string; mode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const ticketId = typeof body.ticketId === "string" ? body.ticketId.trim() : "";
  const mode = body.mode === "draft" || body.mode === "tips" ? body.mode : null;
  if (!ticketId || !mode) {
    return NextResponse.json(
      { error: "ticketId and mode (draft|tips) are required" },
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
${threadText}`;

  try {
    if (mode === "draft") {
      const draftMessage =
        userPrompt +
        "\n\nWrite a suggested reply the VA can send to the member. Match the member's tone, use their context, and go one step beyond the literal ask where appropriate. Output only the reply text (no preamble).";
      const completion = await anthropic.messages.create({
model: ANTHROPIC_MODEL,
      max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: draftMessage }],
      });

      const textBlock = completion.content.find((b) => b.type === "text");
      const draft =
        (textBlock && "text" in textBlock ? textBlock.text : "").trim() ||
        "I couldn't generate a draft. Try again or write your own.";
      return NextResponse.json({ draft });
    }

    // mode === "tips"
    const tipsInstruction =
      "List 3-5 concrete ideas for how the VA can go one step further on this task: anticipate the member's next need, add value beyond the minimum, reduce mental load. Return a JSON array of strings, e.g. [\"idea 1\", \"idea 2\"] with no other text.";
    const completion = await anthropic.messages.create({
model: ANTHROPIC_MODEL,
    max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt + "\n\n" + tipsInstruction }],
    });

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
    const message = err instanceof Error ? err.message : "Assistant error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
