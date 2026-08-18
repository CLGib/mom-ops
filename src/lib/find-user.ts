import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Find an existing auth user's id by email, using the indexed `profiles.email`
 * column.
 *
 * Why this exists: the Stripe webhook used to call `auth.admin.listUsers({
 * perPage: 1000 })` and scan the result to match an email. That is O(all users)
 * on every checkout and — worse — silently fails once you pass 1,000 users (a
 * new buyer above that count would never be matched, creating a duplicate
 * account). Looking up `profiles.email` is a single indexed query that stays
 * correct at any scale.
 *
 * Emails are compared exactly after lowercasing. Supabase (GoTrue) stores auth
 * emails lowercased and the profile row mirrors that, so an exact match is both
 * safe (no `ILIKE` wildcard surprises for emails containing `_` or `%`) and
 * correct. Returns null when no profile matches.
 */
export async function findUserIdByEmail(
  db: SupabaseClient,
  email: string | null | undefined
): Promise<string | null> {
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized) return null;
  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("email", normalized)
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
