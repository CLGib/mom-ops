import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SidebarLayout from "../components/SidebarLayout";
import HeaderUser from "../components/HeaderUser";

export const dynamic = "force-dynamic";

export default async function ToolboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/toolbox"));

  const [
    { data: roleRow },
    { data: adminRow },
    { data: directorRow },
  ] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("directors").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const role = roleRow?.role ?? null;
  const isAdmin = role === "admin" || !!adminRow;
  const isDirector = role === "director" || !!directorRow;
  const isVa = role === "va";

  if (!isVa && !isAdmin && !isDirector) {
    redirect("/no-access");
  }

  const backHref = isAdmin ? "/admin" : isDirector ? "/director" : "/va";
  const backLabel = isAdmin ? "Back to CEO Dashboard" : isDirector ? "Back to CXO" : "Back to VA Dashboard";
  const navLinks = [
    { href: "/toolbox", label: "VA Toolbox" },
    { href: "/toolbox/templates", label: "Template Generator" },
    { href: "/toolbox/branding", label: "Branding Assistant" },
    { href: "/toolbox/mockup", label: "Mock-Up Generator" },
    { href: backHref, label: backLabel },
  ];

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
      brandLabel="VA Toolbox"
      brandHref="/toolbox"
      navLinks={navLinks.map((l) => ({ href: l.href, label: l.label }))}
      headerRight={<></>}
      drawerFooter={drawerFooter}
    >
      {children}
    </SidebarLayout>
  );
}
