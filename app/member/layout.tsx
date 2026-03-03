import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MemberPortalLayout from "../components/MemberPortalLayout";
import HeaderUser from "../components/HeaderUser";
import NPSPopover from "./NPSPopover";

export const dynamic = "force-dynamic";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/member"));

  await supabase.rpc("redeem_member_invite");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_founding_member, profile_completion, preferred_name, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  const displayName = profile?.preferred_name?.trim() || profile?.full_name?.trim() || user.email;

  const navLinks = [
    { href: "/member", label: "Home" },
    { href: "/member/pending", label: "Tasks" },
    { href: "/member/completed", label: "Completed Tasks" },
    { href: "/member/explore-tasks", label: "Explore tasks" },
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
        </HeaderUser>
      }
    >
      {children}
      <NPSPopover />
    </MemberPortalLayout>
  );
}
