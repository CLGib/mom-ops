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
    .select("is_founding_member")
    .eq("id", user.id)
    .single();

  return (
    <div className="app-shell" style={{ width: "100%" }}>
      <header
        className="member-profile-bar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-md)",
          padding: "var(--space-sm) 0",
          marginBottom: "var(--space-lg)",
          borderBottom: "1px solid var(--color-border, #e5e5e5)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap" }}>
          <span
            className="member-profile-email"
            style={{
              fontSize: "0.9rem",
              color: "var(--text-muted, #666)",
              fontWeight: 500,
            }}
            title="Logged in as"
          >
            {user.email}
          </span>
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
        </span>
        <Link
          href="/api/auth/signout"
          className="link"
          style={{ fontSize: "0.875rem" }}
        >
          Log out
        </Link>
      </header>
      {children}
    </div>
  );
}
