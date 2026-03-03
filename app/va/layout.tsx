import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SidebarLayout from "../components/SidebarLayout";

export const dynamic = "force-dynamic";

const VA_NAV_LINKS = [
  { href: "/va", label: "Dashboard" },
  { href: "/va/tasks", label: "Tasks" },
  { href: "/va/onboarding", label: "Onboarding" },
  { href: "/va/assets", label: "Assets" },
  { href: "/va/explore-tasks", label: "Explore Tasks" },
  { href: "/va/feedback", label: "Request a Feature & Report Bug" },
  { href: "/va/profile", label: "Profile" },
] as const;

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va"));

  const { data: vaProfile } = await supabase
    .from("va_profiles")
    .select("display_name, profile_image_url, onboarding_complete")
    .eq("user_id", user.id)
    .single();

  const displayName = vaProfile?.display_name?.trim() || user.email?.split("@")[0] || "VA";
  const profileImageUrl = vaProfile?.profile_image_url ?? null;

  const { data: completed } = await supabase
    .from("tickets")
    .select("credit_cost, tip_amount")
    .eq("assigned_va_id", user.id)
    .in("status", ["completed", "closed"]);

  const { data: reviewedTickets } = await supabase
    .from("tickets")
    .select("rating")
    .eq("assigned_va_id", user.id)
    .not("rating", "is", null);

  const VA_PAYOUT_RATE = 0.2;
  const taskEarnings = completed?.reduce((sum, t) => sum + (t.credit_cost ?? 0) * VA_PAYOUT_RATE, 0) ?? 0;
  const tipsTotal = completed?.reduce((sum, t) => sum + (t.tip_amount ?? 0) / 100, 0) ?? 0;
  const payoutSummary = taskEarnings + tipsTotal;

  const reviewCount = reviewedTickets?.length ?? 0;
  const avgRating =
    reviewCount > 0
      ? (reviewedTickets!.reduce((sum, t) => sum + (t.rating ?? 0), 0) / reviewCount).toFixed(1)
      : null;

  const sidebarExtra = (
    <>
      <div style={{ fontSize: "0.8125rem", color: "var(--text-muted, #5c5955)" }}>
        <div style={{ fontWeight: 600, color: "var(--text, #1a1917)", marginBottom: "var(--space-2xs)" }}>
          Payout
        </div>
        <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)" }}>
          ${payoutSummary.toFixed(2)}
        </div>
        <div style={{ marginTop: "var(--space-2xs)" }}>20% per credit + tips</div>
      </div>
      {avgRating != null && (
        <div style={{ fontSize: "0.8125rem", color: "var(--text-muted, #5c5955)" }}>
          <div style={{ fontWeight: 600, color: "var(--text, #1a1917)", marginBottom: "var(--space-2xs)" }}>
            Rating
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)" }}>
            {avgRating} out of 5
          </div>
          <div style={{ marginTop: "var(--space-2xs)" }}>
            {reviewCount} review{reviewCount !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </>
  );

  return (
    <SidebarLayout
      brandLabel="Mom Ops VA"
      brandHref="/va"
      navLinks={VA_NAV_LINKS.map((l) => ({ href: l.href, label: l.label }))}
      sidebarExtra={sidebarExtra}
      headerRight={
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
              fontSize: "0.875rem",
              color: "var(--text, #1a1917)",
            }}
            title={user.email ?? undefined}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                overflow: "hidden",
                flexShrink: 0,
                backgroundColor: "var(--color-muted-bg, #f0f0f0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--text-muted, #666)",
                  }}
                >
                  {getInitials(displayName)}
                </span>
              )}
            </span>
            <span style={{ fontWeight: 500 }}>{displayName}</span>
          </span>
          <a href="/api/auth/signout" className="link" style={{ fontSize: "0.875rem" }}>
            Log out
          </a>
        </span>
      }
    >
      {children}
    </SidebarLayout>
  );
}
