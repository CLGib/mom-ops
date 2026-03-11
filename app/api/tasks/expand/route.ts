import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, checkAndIncrementDailyCap, RATE_LIMITS } from "@/lib/rate-limit";

const SYSTEM_PROMPT = `You help turn a member's short or messy task idea into a clear, warm, well-articulated task for a virtual assistant.

Your goals:
- Make the member feel like they explained themselves perfectly — even if their input was half a sentence.
- Make the VA genuinely excited to work on this — the description should feel like a real person with a clear vision, not a dry ticket.
- Infer reasonable details from context. If she says "birthday party for my 5 year old," you can assume kid-friendly, age-appropriate, fun. Don't leave obvious gaps the VA will have to ask about.
- Keep it brief. 1–3 sentences in the description. Enough to be clear and human, not so much it feels like a brief.

Voice: Warm, clear, organized. The description should read like a thoughtful mom who knows what she wants — even if the original input was "idk birthday stuff help."

Rules:
- Return ONLY valid JSON with exactly two keys: "subject" (string, short title) and "description" (string, 1–3 sentences).
- No markdown, no code fence, no explanation.
- Never invent details that contradict what the member said. If you're filling in a gap, keep it general enough to be easily adjusted.

Examples:
Input: "need camp stuff for summer"
Output: {"subject":"Summer camp research","description":"I'd love help finding 3 solid summer day camp options for my kids — looking for something fun and age-appropriate with dates and pricing so I can compare easily."}

Input: "ugh meal planning"
Output: {"subject":"Weekly meal plan","description":"I need a simple weekly meal plan — easy dinners that don't require a ton of ingredients. Bonus if there's a grocery list I can just grab and go with."}

Input: "party for emma turning 4"
Output: {"subject":"Emma's 4th birthday party planning","description":"I'm starting to plan Emma's 4th birthday party and could use help pulling it together — theme ideas, a simple timeline for the day, and maybe an invitation I can send out to parents."}`;

export async function POST(request: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitResult = await checkRateLimit(`tasks-expand:${user.id}`, RATE_LIMITS.tasksExpand);
  if (!limitResult.success) {
    const retryAfter = Math.max(1, limitResult.reset - Math.floor(Date.now() / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  const dailyCapResult = await checkAndIncrementDailyCap(user.id);
  if (!dailyCapResult.allowed) {
    return NextResponse.json(
      { error: "Daily limit of 20 AI improvements reached. Resets at midnight UTC." },
      { status: 429 }
    );
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: err || "Anthropic API error" },
        { status: res.status >= 500 ? 502 : 400 }
      );
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const block = data.content?.find((c) => c.type === "text");
    const raw = block?.text?.trim() ?? "";
    let subject = "";
    let description = "";
    try {
      const parsed = JSON.parse(raw) as { subject?: string; description?: string };
      subject = typeof parsed.subject === "string" ? parsed.subject : "";
      description = typeof parsed.description === "string" ? parsed.description : "";
    } catch {
      return NextResponse.json({ error: "Could not parse AI response" }, { status: 502 });
    }

    return NextResponse.json({ subject, description });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
