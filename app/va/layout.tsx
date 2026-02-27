import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
    .select("display_name, profile_image_url")
    .eq("user_id", user.id)
    .single();

  const displayName = vaProfile?.display_name?.trim() || user.email?.split("@")[0] || "VA";
  const profileImageUrl = vaProfile?.profile_image_url ?? null;

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
        <Link href="/va" className="link" style={{ fontSize: "0.9rem", fontWeight: 500 }}>
          VA Dashboard
        </Link>
        <Link href="/va/profile" className="link" style={{ fontSize: "0.9rem", fontWeight: 500 }}>
          Profile
        </Link>
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
          <a
            href="/api/auth/signout"
            className="link"
            style={{ fontSize: "0.875rem" }}
          >
            Log out
          </a>
        </span>
      </header>
      {children}
    </div>
  );
}
