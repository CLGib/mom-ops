"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { queueEmail } from "@/lib/email/queue";

const MILESTONE_TIER1_50 = "tier1_50";
const TIER1_50_BONUS_CENTS = 500;

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL or service role key not set");
  return createClient(url, key);
}

/** Resolve CEO/admin email for milestone notifications (same pattern as low_rating_alert). */
async function getAdminEmail(service: ReturnType<typeof getServiceSupabase>): Promise<string | null> {
  const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL;
  if (adminAlertEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminAlertEmail)) {
    return adminAlertEmail;
  }
  const { data: adminRows } = await service.from("admins").select("user_id").limit(1);
  if (!adminRows?.[0]?.user_id) return null;
  const { data: adminData } = await service.auth.admin.getUserById(adminRows[0].user_id);
  const email = adminData?.user?.email;
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/**
 * Idempotent claim of Tier 1 (50 tickets) milestone: insert va_milestones + va_milestone_bonuses
 * and queue CEO email. Returns { claimed: true } only the first time the VA qualifies.
 */
export async function claimTier1Milestone(): Promise<{ claimed: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { claimed: false };

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (roleRow?.role !== "va") return { claimed: false };

    const { count: closedCount, error: countError } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("assigned_va_id", user.id)
      .in("status", ["completed", "closed"]);
    if (countError || closedCount == null || closedCount < 50) return { claimed: false };

    const { data: existing } = await supabase
      .from("va_milestones")
      .select("va_id")
      .eq("va_id", user.id)
      .eq("milestone", MILESTONE_TIER1_50)
      .maybeSingle();
    if (existing) return { claimed: false };

    const service = getServiceSupabase();
    const { error: milestoneError } = await service
      .from("va_milestones")
      .insert({ va_id: user.id, milestone: MILESTONE_TIER1_50 });
    if (milestoneError?.code === "23505") return { claimed: false }; // unique violation = already claimed
    if (milestoneError) {
      console.error("[claimTier1Milestone] va_milestones insert failed:", milestoneError);
      return { claimed: false, error: "Failed to record milestone." };
    }

    const { error: bonusError } = await service.from("va_milestone_bonuses").insert({
      va_id: user.id,
      milestone_type: MILESTONE_TIER1_50,
      amount_cents: TIER1_50_BONUS_CENTS,
    });
    if (bonusError) {
      console.error("[claimTier1Milestone] va_milestone_bonuses insert failed:", bonusError);
      return { claimed: true, error: "Bonus record failed." }; // milestone already recorded
    }

    const { data: vaProfile } = await service
      .from("va_profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();
    const vaDisplayName = vaProfile?.display_name?.trim() ?? user.email?.split("@")[0] ?? "A VA";

    const toEmail = await getAdminEmail(service);
    if (toEmail) {
      await queueEmail({
        to_email: toEmail,
        template: "va_tier1_milestone_ceo_v1",
        payload: { va_id: user.id, va_display_name: vaDisplayName },
        dedupe_key: `va_tier1_50:${user.id}`,
      });
    }

    return { claimed: true };
  } catch (e) {
    console.error("[claimTier1Milestone]", e);
    return { claimed: false, error: e instanceof Error ? e.message : "Claim failed." };
  }
}
