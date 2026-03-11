import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import {
  computeVaQuizScore,
  getScoreBand,
  VA_QUIZ_MAX_SCORE,
} from "@/lib/va-apply-quiz";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limitResult = await checkRateLimit(`va-apply:${ip}`, RATE_LIMITS.vaApply);
  if (!limitResult.success) {
    const retryAfter = Math.max(1, limitResult.reset - Math.floor(Date.now() / 1000));
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  let body: {
    email?: string;
    name?: string;
    answers?: Record<string, string>;
    creativeResponse?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() || null : null;
  const answers = typeof body.answers === "object" && body.answers !== null ? body.answers : {};
  const creativeResponse = typeof body.creativeResponse === "string" ? body.creativeResponse.trim() || null : null;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }

  const { total, scorePct, details } = computeVaQuizScore(answers);
  const band = getScoreBand(total);
  const attentionDetails = {
    total,
    max: VA_QUIZ_MAX_SCORE,
    band,
    answers: details.answers,
    scores: details.scores,
  };

  const supabase = createServiceClient();
  const { error } = await supabase.from("va_applications").insert({
    email,
    name,
    attention_score_pct: scorePct,
    attention_details: attentionDetails,
    creative_response: creativeResponse,
  });

  if (error) {
    console.error("[va-apply] insert error:", error.message);
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
