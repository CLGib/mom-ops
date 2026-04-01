import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VALayoutClient from "./VALayoutClient";
import VATierProgressBar from "./VATierProgressBar";
import { claimTier1Milestone } from "./actions";

export const dynamic = "force-dynamic";

function getVaNavLinks(inboxBadgeCount: number) {
  return [
    { group: "Work" as const, href: "/va/tasks", label: "Tasks", badge: inboxBadgeCount > 0 ? inboxBadgeCount : undefined },
    { group: "Work" as const, href: "/va/outreach", label: "Check-ins" },
    { group: "Resources" as const, href: "/va/explore-tasks", label: "Search Tasks" },
    { group: "Resources" as const, href: "/va/canva-links", label: "Canva links" },
    { group: "Resources" as const, href: "/va/email-macros", label: "Macros" },
    { group: "Resources" as const, href: "/toolbox/templates", label: "Template Generator" },
    { group: "Resources" as const, href: "/toolbox/branding", label: "Branding Assistant" },
    { group: "Resources" as const, href: "/toolbox/mockup", label: "Mock-Up Generator" },
    { group: "Resources" as const, href: "/toolbox#how-to-videos", label: "How to videos" },
    { group: "Resources" as const, href: "/va/onboarding", label: "Onboarding" },
    { group: "Resources" as const, href: "/va/training", label: "Training" },
    { group: "Support" as const, href: "/va/feedback", label: "Request a Feature & Report Bug" },
    { group: "Support" as const, href: "/va/community", label: "Community" },
    { group: "Account" as const, href: "/va/profile", label: "Profile" },
  ];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

export default async function VALayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let supabase;
  try {
    supabase = await createClient();
  } catch (createErr) {
    const msg = createErr instanceof Error ? createErr.message : String(createErr);
    console.error("[VA layout] createClient failed:", msg);
    throw createErr;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va"));

  const { data: vaProfile, error: vaProfileErr } = await supabase
    .from("va_profiles")
    .select("display_name, profile_image_url, onboarding_complete, training_complete")
    .eq("user_id", user.id)
    .maybeSingle();
  if (vaProfileErr) {
    console.error("[VA layout] va_profiles query failed:", vaProfileErr.message, vaProfileErr.code);
  }

  const displayName = vaProfile?.display_name?.trim() || user.email?.split("@")[0] || "VA";
  const profileImageUrl = vaProfile?.profile_image_url ?? null;

  const assignedRes = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("assigned_va_id", user.id)
    .in("status", ["new", "assigned", "awaiting_member_approval", "in_progress", "waiting_on_member"]);
  const assignedCount = assignedRes.error ? 0 : (assignedRes.count ?? 0);

  const { data: mentionRows } = await supabase
    .from("ticket_mentions")
    .select("ticket_id")
    .eq("mentioned_user_id", user.id);
  const mentionedTicketIds = [...new Set((mentionRows ?? []).map((r) => r.ticket_id))];
  let mentionedOnlyInboxCount = 0;
  if (mentionedTicketIds.length > 0) {
    const { data: mentionedTickets } = await supabase
      .from("tickets")
      .select("id, assigned_va_id, status")
      .in("id", mentionedTicketIds);
    const terminal = ["completed", "closed", "cancelled_by_va", "cancelled_by_admin"];
    mentionedOnlyInboxCount = (mentionedTickets ?? []).filter(
      (t) => t.assigned_va_id !== user.id && t.status && !terminal.includes(t.status)
    ).length;
  }
  const inboxBadgeCount = assignedCount + mentionedOnlyInboxCount;

  const completedRes = await supabase
    .from("tickets")
    .select("credit_cost, tip_amount, was_hot_when_claimed")
    .eq("assigned_va_id", user.id)
    .in("status", ["completed", "closed"]);
  const completed = completedRes.error ? [] : (completedRes.data ?? []);
  const closedCount = completed.length;

  const { data: milestoneBonuses } = await supabase
    .from("va_milestone_bonuses")
    .select("amount_cents")
    .eq("va_id", user.id);
  const milestoneBonusCents = (milestoneBonuses ?? []).reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);

  const { data: tier1Milestone } = await supabase
    .from("va_milestones")
    .select("va_id")
    .eq("va_id", user.id)
    .eq("milestone", "tier1_50")
    .maybeSingle();
  const tier1Reached = !!tier1Milestone;

  let showTier1Celebration = false;
  if (closedCount >= 50) {
    const claim = await claimTier1Milestone();
    showTier1Celebration = claim.claimed === true;
  }
  const tier1ReachedForDisplay = tier1Reached || showTier1Celebration;

  const reviewedRes = await supabase
    .from("tickets")
    .select("rating")
    .eq("assigned_va_id", user.id)
    .not("rating", "is", null);
  const reviewedTickets = reviewedRes.error ? [] : (reviewedRes.data ?? []);

  const VA_PAYOUT_RATE = 0.2;
  const HOT_TASK_PAY_MULTIPLIER = 1.1;
  const taskEarnings = completed.reduce((sum, t) => {
    const rate = t.was_hot_when_claimed ? VA_PAYOUT_RATE * HOT_TASK_PAY_MULTIPLIER : VA_PAYOUT_RATE;
    return sum + (t.credit_cost ?? 0) * rate;
  }, 0);
  const tipsTotal = completed.reduce((sum, t) => sum + (t.tip_amount ?? 0) / 100, 0);
  const milestoneBonusTotal = milestoneBonusCents / 100;
  const payoutSummary = taskEarnings + tipsTotal + milestoneBonusTotal;

  const reviewCount = reviewedTickets.length;
  const avgRating =
    reviewCount > 0
      ? (reviewedTickets.reduce((sum, t) => sum + (t.rating ?? 0), 0) / reviewCount).toFixed(1)
      : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://themomops.com";

  const sidebarExtra = (
    <>
      <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.2)", margin: "var(--space-md) 0" }} aria-hidden />
      <div style={{ fontSize: "0.8125rem", color: "#fff" }}>
        <div style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>
          Payout
        </div>
        <div style={{ fontSize: "1rem", fontWeight: 600 }}>
          ${payoutSummary.toFixed(2)}
        </div>
        <div style={{ marginTop: "var(--space-2xs)" }}>
          Credits: ${taskEarnings.toFixed(2)} · Tips: ${tipsTotal.toFixed(2)}
          {milestoneBonusTotal > 0 && ` · Bonuses: $${milestoneBonusTotal.toFixed(2)}`}
        </div>
        <div style={{ marginTop: "var(--space-2xs)", opacity: 0.9 }}>20% per credit + tips</div>
      </div>
      {avgRating != null && (
        <div style={{ fontSize: "0.8125rem", color: "#fff" }}>
          <div style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>
            Rating
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 600 }}>
            {avgRating} out of 5
          </div>
          <div style={{ marginTop: "var(--space-2xs)" }}>
            {reviewCount} review{reviewCount !== 1 ? "s" : ""}
          </div>
          <a href="/va/reviews" className="link" style={{ display: "inline-block", marginTop: "var(--space-2xs)", fontSize: "0.875rem" }}>
            Read my reviews →
          </a>
        </div>
      )}
      <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="link" style={{ display: "inline-block", marginTop: "var(--space-sm)", fontSize: "0.8125rem", color: "#fff", opacity: 0.9 }}>
        Reviews on website →
      </a>
    </>
  );

  const drawerFooter = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", minWidth: 0 }}>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            backgroundColor: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {profileImageUrl ? (
            <img src={profileImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
              {getInitials(displayName)}
            </span>
          )}
        </span>
        <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={user.email ?? undefined}>
          {displayName}
        </span>
      </div>
      <a href="/api/auth/signout" className="link" style={{ fontSize: "0.875rem" }}>
        Log out
      </a>
    </div>
  );

  return (
    <VALayoutClient
      brandLabel="Mom Ops VA"
      brandHref="/va"
      navLinks={getVaNavLinks(inboxBadgeCount)}
      sidebarExtra={sidebarExtra}
      drawerFooter={drawerFooter}
      headerRight={<></>}
    >
      <>
        <VATierProgressBar
          closedCount={closedCount}
          tier1Reached={tier1ReachedForDisplay}
          showTier1Celebration={showTier1Celebration}
        />
        {children}
      </>
    </VALayoutClient>
  );
}
