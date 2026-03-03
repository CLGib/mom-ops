import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SidebarLayout from "../components/SidebarLayout";
import HeaderUser from "../components/HeaderUser";

export const dynamic = "force-dynamic";

const DIRECTOR_NAV_LINKS = [
  { href: "/director", label: "Dashboard" },
  { href: "/director/analytics", label: "Analytics" },
  { href: "/director/vas", label: "VAs" },
  { href: "/director/tasks", label: "Tasks" },
  { href: "/director/reviews", label: "Reviews" },
  { href: "/director/members", label: "Members" },
  { href: "/director/nps", label: "NPS" },
  { href: "/director/feature-bug", label: "Feature & Bug Log" },
  { href: "/director/feedback", label: "Request a Feature & Report Bug" },
  { href: "/director/account", label: "Account" },
] as const;

export default async function DirectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/director"));

  const [{ data: roleRow }, { data: directorRow }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase.from("directors").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const role = roleRow?.role ?? null;
  const isDirector = role === "director" || !!directorRow;
  if (!isDirector) {
    redirect("/no-access?reason=director");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_name, full_name, avatar_url")
    .eq("id", user.id)
    .single();
  const displayName = profile?.preferred_name?.trim() || profile?.full_name?.trim() || user.email || "Account";

  return (
    <SidebarLayout
      brandLabel="CXO"
      brandHref="/director"
      navLinks={DIRECTOR_NAV_LINKS.map((l) => ({ href: l.href, label: l.label }))}
      headerRight={
        <HeaderUser
          displayName={displayName}
          avatarUrl={profile?.avatar_url}
          title={user.email ?? undefined}
        />
      }
    >
      {children}
    </SidebarLayout>
  );
}
