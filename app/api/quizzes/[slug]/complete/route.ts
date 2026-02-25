import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sumPointsByOutcome,
  pickOutcome,
  mergeProfileWrites,
  type OptionForScoring,
} from "@/lib/quiz-scoring";

const QUIZ_PROFILE_KEYS = [
  "stress_triggers",
  "community_roles",
  "home_aesthetic",
  "household",
  "recurring_events",
] as const;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  let body: { answers?: Record<string, string | string[]> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const answers = body.answers ?? {};
  if (typeof answers !== "object" || Array.isArray(answers)) {
    return NextResponse.json({ error: "answers must be an object" }, { status: 400 });
  }

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id")
    .eq("slug", slug)
    .single();
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id")
    .eq("quiz_id", quiz.id);
  const questionIds = (questions ?? []).map((q) => q.id);

  const { data: options } = await supabase
    .from("quiz_options")
    .select("id, outcome_slug, points, profile_writes")
    .in("question_id", questionIds);

  const optionsById = new Map<string, OptionForScoring>();
  for (const o of options ?? []) {
    optionsById.set(o.id, {
      id: o.id,
      outcome_slug: o.outcome_slug ?? null,
      points: o.points ?? 0,
      profile_writes: (o.profile_writes as Record<string, unknown> | null) ?? null,
    });
  }

  const { data: outcomes } = await supabase
    .from("quiz_outcomes")
    .select("outcome_slug, title, description, sort_order")
    .eq("quiz_id", quiz.id)
    .order("sort_order", { ascending: true });

  const outcomeOrder = (outcomes ?? []).map((o) => o.outcome_slug);
  const pointsByOutcome = sumPointsByOutcome(answers, optionsById);
  const outcomeSlug = pickOutcome(pointsByOutcome, outcomeOrder);
  const outcomeRow = (outcomes ?? []).find((o) => o.outcome_slug === outcomeSlug);
  if (!outcomeRow) {
    return NextResponse.json(
      { error: "Could not resolve outcome" },
      { status: 500 }
    );
  }

  const { data: resultRow, error: insertResultErr } = await supabase
    .from("quiz_results")
    .insert({
      member_id: user.id,
      quiz_id: quiz.id,
      outcome_slug: outcomeRow.outcome_slug,
      outcome_title: outcomeRow.title,
      outcome_description: outcomeRow.description ?? null,
    })
    .select("id")
    .single();

  if (insertResultErr) {
    return NextResponse.json(
      { error: insertResultErr.message },
      { status: 500 }
    );
  }

  const mergedWrites = mergeProfileWrites(answers, optionsById);
  if (Object.keys(mergedWrites).length > 0) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("stress_triggers, community_roles, home_aesthetic, household, recurring_events")
      .eq("id", user.id)
      .single();

    const updates: Record<string, unknown> = {};
    for (const key of QUIZ_PROFILE_KEYS) {
      const v = mergedWrites[key];
      if (v === undefined) continue;
      const existingVal = existing?.[key as keyof typeof existing];
      if (Array.isArray(v)) {
        const existingArr = Array.isArray(existingVal) ? existingVal : [];
        const combined = [...existingArr, ...v];
        const seen = new Set<string>();
        updates[key] = combined.filter((x) => {
          const k = typeof x === "object" && x !== null ? JSON.stringify(x) : String(x);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      } else {
        updates[key] = v;
      }
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from("profiles").update(updates).eq("id", user.id);
    }
  }

  await supabase
    .from("quiz_responses")
    .upsert(
      {
        member_id: user.id,
        quiz_id: quiz.id,
        status: "completed",
        answers,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id,quiz_id" }
    );

  return NextResponse.json({
    outcome_slug: outcomeRow.outcome_slug,
    result_id: resultRow?.id,
  });
}
