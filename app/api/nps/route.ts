import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitResult = await checkRateLimit(`nps:${user.id}`, RATE_LIMITS.nps);
  if (!limitResult.success) {
    const retryAfter = Math.max(1, limitResult.reset - Math.floor(Date.now() / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  let body: { score?: number; comment?: string; dismissed?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dismissed = body.dismissed === true;
  const score = typeof body.score === "number" ? body.score : undefined;
  const comment = typeof body.comment === "string" ? body.comment.trim() || null : null;

  if (dismissed) {
    const { error } = await supabase.from("nps_responses").insert({
      user_id: user.id,
      score: null,
      comment: null,
      dismissed: true,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, action: "dismissed" });
  }

  if (score == null || score < 0 || score > 10) {
    return NextResponse.json(
      { error: "score required (0-10) when not dismissing" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("nps_responses").insert({
    user_id: user.id,
    score,
    comment,
    dismissed: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action: "submitted" });
}
