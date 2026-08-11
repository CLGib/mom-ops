import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * True if the member is entitled to a kit: they bought it à-la-carte
 * (a kit_purchases row) OR they have an active all-access subscription.
 * Uses the service role so it works from routes/pages regardless of RLS.
 */
export async function ownsKit(userId: string, kitId: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return false;
  const db = createServiceClient(url, serviceKey);

  const { data: purchase } = await db
    .from("kit_purchases")
    .select("id")
    .eq("member_id", userId)
    .eq("kit_id", kitId)
    .limit(1)
    .maybeSingle();
  if (purchase) return true;

  const { data: profile } = await db
    .from("profiles")
    .select("subscription_status")
    .eq("id", userId)
    .maybeSingle();
  return profile?.subscription_status === "active";
}
