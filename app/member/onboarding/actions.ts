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

  const profileUpdates: Record<string, unknown> = {
    onboarding_completed_at: new Date().toISOString(),
  };

  if (answers.tone) {
    profileUpdates.communication_tone = answers.tone;
  }
  if (answers.kidsCount != null) {
    profileUpdates.kids_count = answers.kidsCount;
  }
  if (answers.kidsAges && Array.isArray(answers.kidsAges) && answers.kidsAges.length > 0) {
    const ages = answers.kidsAges.map((a) => (typeof a === "number" ? a : parseInt(String(a), 10))).filter((n) => !Number.isNaN(n));
    if (ages.length > 0) profileUpdates.kids_ages = ages;
  }
  if (answers.householdMembers && Array.isArray(answers.householdMembers) && answers.householdMembers.length > 0) {
    profileUpdates.household_members = answers.householdMembers.filter((m) => m.type);
  }
  const constraintsParts: string[] = [];
  if (answers.constraints && Array.isArray(answers.constraints) && answers.constraints.length > 0) {
    const opts = answers.constraints.filter((c) => c !== "Other");
    if (opts.length > 0) constraintsParts.push(opts.join(", "));
    if (answers.constraints.includes("Other") && answers.constraintsOther?.trim()) {
      constraintsParts.push(`Other: ${answers.constraintsOther.trim()}`);
    }
  }
  if (answers.upcoming?.trim()) constraintsParts.push(`Coming up (next 30 days): ${answers.upcoming.trim()}`);
  if (constraintsParts.length > 0) {
    profileUpdates.constraints = constraintsParts.join("\n\n");
  }
  if (answers.preferredBrands && Array.isArray(answers.preferredBrands) && answers.preferredBrands.length > 0) {
    const brands = answers.preferredBrands.filter((b) => b !== "Other");
    if (answers.preferredBrands.includes("Other") && answers.preferredBrandsOther?.trim()) {
      brands.push(...answers.preferredBrandsOther.split(",").map((s) => s.trim()).filter(Boolean));
    }
    if (brands.length > 0) profileUpdates.preferred_brands = brands;
  }
  if (answers.timezone?.trim()) {
    profileUpdates.timezone = answers.timezone.trim();
  }
  if (answers.city?.trim()) {
    profileUpdates.city = answers.city.trim();
  }
  if (answers.state?.trim()) {
    profileUpdates.state = answers.state.trim();
  }
  if (answers.task_submission_preference) {
    profileUpdates.task_submission_preference = answers.task_submission_preference;
  }
  if (answers.typical_turnaround) {
    profileUpdates.typical_turnaround = answers.typical_turnaround;
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .update(profileUpdates)
    .eq("id", user.id);
  if (profileErr) {
    return { error: profileErr.message };
  }

  return { error: null };
}
