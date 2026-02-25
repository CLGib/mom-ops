import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `You help turn a member's short or messy task idea into a clear, brief task for a virtual assistant.
Return ONLY valid JSON with exactly two keys: "subject" (string, short title) and "description" (string, 1-2 sentences).
No markdown, no code fence, no explanation. Example: {"subject":"Research summer camps","description":"Find 3 summer day camps in the area for ages 6-8, with dates and prices."}`;

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
        model: "claude-3-5-sonnet-20241022",
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
