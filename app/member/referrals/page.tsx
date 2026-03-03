import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReferralSection from "../ReferralSection";

export const dynamic = "force-dynamic";

export default async function MemberReferralsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/member/referrals"));

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  const { data: balance } = await supabase.rpc("get_member_balance", {
    p_member_id: user.id,
  });

  const isActive =
    profile?.subscription_status === "active" || (balance != null && (balance as number) > 0);

  const referralLink = `${process.env.NEXT_PUBLIC_SITE_URL || "https://themomops.com"}/?ref=${user.id}`;

  return (
    <main className="app-shell">
      <h1 className="page-title">Referrals</h1>

      {!isActive && (
        <div
          className="card"
          style={{ marginBottom: "var(--space-lg)", borderColor: "var(--color-border)" }}
        >
          <p className="section-lead" style={{ marginBottom: "var(--space-sm)" }}>
            Your subscription is not active. Reactivate to refer friends and earn Task Credits when
            they sign up and subscribe.
          </p>
        </div>
      )}

      {isActive && <ReferralSection referralLink={referralLink} />}
    </main>
  );
}
