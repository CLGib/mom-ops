import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_founding_member, profile_completion, preferred_name, full_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.preferred_name?.trim() || profile?.full_name?.trim() || user.email;

  return (
    <div className="app-shell app-shell--member" style={{ width: "100%" }}>
      <header className="member-profile-bar">
        <div className="member-profile-bar__nav">
          <Link href="/member" className="link" style={{ fontSize: "0.9rem", fontWeight: 500 }}>
            Home
          </Link>
          <Link href="/member/profile" className="link" style={{ fontSize: "0.9rem", fontWeight: 500 }}>
            Profile
            {profile?.profile_completion != null && profile.profile_completion < 100 && (
              <span style={{ marginLeft: "var(--space-xs)", color: "var(--text-muted, #666)" }}>({profile.profile_completion}%)</span>
            )}
          </Link>
          {profile?.is_founding_member && (
            <span
              className="founder-badge"
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                background: "var(--accent-soft-bg, #f8f5ed)",
                color: "var(--accent, #b8860b)",
                letterSpacing: "0.02em",
              }}
            >
              Founding Member
            </span>
          )}
        </div>
        <div className="member-profile-bar__user">
          <span className="member-profile-email" title={user.email}>
            {displayName}
          </span>
          <a href="/api/auth/signout" className="link member-profile-bar__logout">
            Log out
          </a>
        </div>
      </header>
      {children}
    </div>
  );
}
