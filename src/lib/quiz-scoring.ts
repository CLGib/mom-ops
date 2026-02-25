/**
 * Server-only quiz scoring and profile-write aggregation.
 * Used by POST /api/quizzes/[slug]/complete.
 */

export type OptionForScoring = {
  id: string;
  outcome_slug: string | null;
  points: number;
  profile_writes: Record<string, unknown> | null;
};

/**
 * Sum points per outcome_slug from the member's answers.
 * Returns map of outcome_slug -> total points.
 */
export function sumPointsByOutcome(
  answers: Record<string, string | string[]>,
  optionsById: Map<string, OptionForScoring>
): Map<string, number> {
  const pointsByOutcome = new Map<string, number>();
  for (const questionId of Object.keys(answers)) {
    const val = answers[questionId];
    const optionIds = Array.isArray(val) ? val : val ? [val] : [];
    for (const optionId of optionIds) {
      const opt = optionsById.get(optionId);
      if (!opt?.outcome_slug) continue;
      const prev = pointsByOutcome.get(opt.outcome_slug) ?? 0;
      pointsByOutcome.set(opt.outcome_slug, prev + opt.points);
    }
  }
  return pointsByOutcome;
}

/**
 * Pick the winning outcome_slug: highest points; tie-break by order in outcomeOrder.
 */
export function pickOutcome(
  pointsByOutcome: Map<string, number>,
  outcomeOrder: string[]
): string | null {
  let bestSlug: string | null = null;
  let bestPoints = -1;
  for (const slug of outcomeOrder) {
    const p = pointsByOutcome.get(slug) ?? 0;
    if (p > bestPoints) {
      bestPoints = p;
      bestSlug = slug;
    }
  }
  if (bestSlug) return bestSlug;
  for (const [slug] of pointsByOutcome) {
    if (!outcomeOrder.includes(slug)) {
      if (bestPoints < 0) bestSlug = slug;
      break;
    }
  }
  return bestSlug ?? outcomeOrder[0] ?? null;
}

/**
 * Aggregate profile_writes from all selected options.
 * - Arrays: concatenate and dedupe (primitives by value, objects by JSON stringify).
 * - Scalars: last wins.
 */
export function mergeProfileWrites(
  answers: Record<string, string | string[]>,
  optionsById: Map<string, OptionForScoring>
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const questionId of Object.keys(answers)) {
    const val = answers[questionId];
    const optionIds = Array.isArray(val) ? val : val ? [val] : [];
    for (const optionId of optionIds) {
      const opt = optionsById.get(optionId);
      const w = opt?.profile_writes;
      if (!w || typeof w !== "object") continue;
      for (const key of Object.keys(w)) {
        const v = w[key];
        if (Array.isArray(v)) {
          const existing = (merged[key] as unknown[]) ?? [];
          const combined = [...existing, ...v];
          const seen = new Set<string>();
          merged[key] = combined.filter((x) => {
            const k = typeof x === "object" && x !== null ? JSON.stringify(x) : String(x);
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
        } else {
          merged[key] = v;
        }
      }
    }
  }
  return merged;
}
