import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import MemberPortalLayout from "../components/MemberPortalLayout";
import HeaderUser from "../components/HeaderUser";
import MemberMetaPixelRegistration from "./MemberMetaPixelRegistration";
import NPSPopover from "./NPSPopover";
import ProfilePhotoOfferPopover from "./ProfilePhotoOfferPopover";
import FreeTrialActivator from "./FreeTrialActivator";

export const dynamic = "force-dynamic";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=" + encodeURIComponent("/member"));

    try {
      await supabase.rpc("redeem_member_invite");
    } catch {
      // Don't block layout if invite redeem fails (e.g. RLS or missing table)
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_founding_member, is_free_trial, profile_completion, preferred_name, full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const displayName =
      profile?.preferred_name?.trim() ||
      profile?.full_name?.trim() ||
      (typeof user.email === "string" ? user.email : null) ||
      "Member";

    const navLinks = [
      { href: "/member", label: "Home" },
      { href: "/member/pending", label: "Tasks" },
      { href: "/member/completed", label: "Completed Tasks" },
      { href: "/member/recurring", label: "Recurring tasks" },
      { href: "/member/helpers", label: "Helpers" },
      { href: "/member/reviews", label: "Reviews" },
      { href: "/member/discovery", label: "Just for Fun" },
      { href: "/member/profile", label: profile?.profile_completion != null && profile.profile_completion < 100 ? `Profile (${profile.profile_completion}%)` : "Profile" },
      { href: "/member/credits", label: "Credits" },
      { href: "/member/referrals", label: "Referrals" },
      { href: "mailto:support@themomops.com", label: "Help / Support" },
      { href: "/member/feedback", label: "Request a Feature & Report Bug" },
      { href: "/api/auth/signout", label: "Log out" },
    ];

    return (
      <MemberPortalLayout
        brandLabel="My Ops Hub"
        brandHref="/member"
        navLinks={navLinks}
        headerRight={
          <HeaderUser
            displayName={displayName}
            avatarUrl={profile?.avatar_url}
            title={user.email ?? undefined}
            nameClassName="member-profile-email"
            logoutClassName="member-portal__header-logout"
          >
            {profile?.is_founding_member && (
              <span
                className="founder-badge"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.25rem 0.5rem",
                  borderRadius: "4px",
                  background: "var(--accent-soft-bg, #f8f5ed)",
                  color: "var(--accent, #b8860b)",
                  letterSpacing: "0.02em",
                }}
              >
                Founding Member
              </span>
            )}
            {profile?.is_free_trial && !profile?.is_founding_member && (
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.25rem 0.5rem",
                  borderRadius: "4px",
                  background: "var(--color-info-bg, #eff6ff)",
                  color: "var(--color-info, #1d4ed8)",
                  letterSpacing: "0.02em",
                }}
              >
                Free trial
              </span>
            )}
          </HeaderUser>
        }
      >
        <MemberMetaPixelRegistration />
        <Suspense fallback={null}>
          <FreeTrialActivator />
        </Suspense>
        {children}
        <NPSPopover />
        <ProfilePhotoOfferPopover />
      </MemberPortalLayout>
    );
  } catch (err) {
    const e = err as Error & { digest?: string };
    if (e?.digest?.startsWith?.("NEXT_REDIRECT") || e?.digest?.startsWith?.("NEXT_NOT_FOUND")) throw err;
    redirect("/login?next=" + encodeURIComponent("/member"));
  }
}
