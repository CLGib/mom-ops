import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  computeTrainingQuizScore,
  VA_TRAINING_QUIZ_QUESTIONS,
} from "@/lib/va-training-quiz";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { answers?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const answers = body.answers;
  if (!answers || typeof answers !== "object") {
    return NextResponse.json(
      { error: "Missing or invalid answers" },
      { status: 400 }
    );
  }

  // Only accept answers for known question ids
  const validIds = new Set(VA_TRAINING_QUIZ_QUESTIONS.map((q) => q.id));
  const filtered: Record<string, string> = {};
  for (const [id, value] of Object.entries(answers)) {
    if (validIds.has(id) && typeof value === "string") {
      filtered[id] = value;
    }
  }

  const { correct, total, scorePct, passed } =
    computeTrainingQuizScore(filtered);

  if (passed) {
    const { error: updateError } = await supabase
      .from("va_profiles")
      .update({
        training_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Could not update profile" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    passed,
    scorePct,
    correct,
    total,
  });
}
