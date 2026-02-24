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
