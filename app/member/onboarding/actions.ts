"use server";

import { createClient } from "@/lib/supabase/server";
import type { OnboardingAnswers } from "./OnboardingSurvey";

export async function submitOnboarding(answers: OnboardingAnswers): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not logged in." };
  }

  const { error: insertErr } = await supabase.from("onboarding_responses").insert({
    member_id: user.id,
    version: 1,
    answers,
  });
  if (insertErr) {
    return { error: insertErr.message };
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.id);
  if (profileErr) {
    return { error: profileErr.message };
  }

  return { error: null };
}
