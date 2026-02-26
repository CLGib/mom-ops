import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin"));

  return (
    <div className="app-shell" style={{ width: "100%" }}>
      <header
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
        <Link href="/admin" className="link" style={{ fontSize: "0.9rem", fontWeight: 500 }}>
          Admin
        </Link>
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          <span style={{ fontSize: "0.875rem", color: "var(--text-muted, #666)" }} title={user.email}>
            {user.email}
          </span>
          <Link
            href="/api/auth/signout"
            className="link"
            style={{ fontSize: "0.875rem" }}
          >
            Log out
          </Link>
        </span>
      </header>
      {children}
    </div>
  );
}
