import { createServiceClient } from "@/lib/supabase/service";

/** Server-only. Returns number of profiles with is_founding_member = true, capped at 50. Never throws. */
export async function getFoundersClaimedCount(): Promise<number> {
  try {
    const supabase = createServiceClient();
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_founding_member", true);
    if (error) {
      console.error("[founders-count]", error);
      return 0;
    }
    return Math.min(50, Math.max(0, count ?? 0));
  } catch (e) {
    // Missing env (SUPABASE_SERVICE_ROLE_KEY) or other config; fail open with 0
    console.error("[founders-count]", e);
    return 0;
  }
}
