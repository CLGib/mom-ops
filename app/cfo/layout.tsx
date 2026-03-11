import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SidebarLayout from "../components/SidebarLayout";
import HeaderUser from "../components/HeaderUser";

export const dynamic = "force-dynamic";

const CFO_NAV_LINKS = [
  { href: "/cfo", label: "Dashboard" },
  { href: "/cfo/analytics", label: "Analytics" },
  { href: "/cfo/vas", label: "VAs (pay & info)" },
  { href: "/cfo/revenue", label: "Revenue" },
  { href: "/cfo/expenses", label: "Upload expenses" },
  { href: "/cfo/export", label: "Export data" },
  { href: "/cfo/nps", label: "NPS" },
  { href: "/cfo/feature-bug", label: "Feature & Bug Log" },
  { href: "/cfo/feedback", label: "Request a Feature & Report Bug" },
  { href: "/cfo/account", label: "Account" },
];

export default async function CfoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/cfo"));

  const [{ data: roleRow }, { data: cfoRow }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase.from("cfos").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const role = roleRow?.role ?? null;
  const isCfo = role === "cfo" || !!cfoRow;
  if (!isCfo) redirect("/no-access");

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_name, full_name, avatar_url")
    .eq("id", user.id)
    .single();
  const displayName = profile?.preferred_name?.trim() || profile?.full_name?.trim() || user.email || "Account";

  const drawerFooter = (
    <HeaderUser
      displayName={displayName}
      avatarUrl={profile?.avatar_url}
      title={user.email ?? undefined}
    />
  );

  return (
    <SidebarLayout
      brandLabel="CFO"
      brandHref="/cfo"
      navLinks={CFO_NAV_LINKS.map((l) => ({ href: l.href, label: l.label }))}
      headerRight={<></>}
      drawerFooter={drawerFooter}
    >
      {children}
    </SidebarLayout>
  );
}
