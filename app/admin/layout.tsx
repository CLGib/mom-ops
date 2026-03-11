import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SidebarLayout from "../components/SidebarLayout";
import HeaderUser from "../components/HeaderUser";

export const dynamic = "force-dynamic";

const ADMIN_NAV_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/revenue", label: "Revenue" },
  { href: "/admin/tasks", label: "Tasks" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/member-fields", label: "Member profile fields" },
  { href: "/admin/specialists", label: "Specialists" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/va-applications", label: "VA applications" },
  { href: "/admin/feature-bug", label: "Feature & Bug Log" },
  { href: "/admin/task-library", label: "Task Library" },
  { href: "/admin/email-macros", label: "Email Macros" },
  { href: "/admin/va-training", label: "VA Training (SOPs)" },
  { href: "/toolbox", label: "VA Toolbox" },
  { href: "/admin/feedback", label: "Request a Feature & Report Bug" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/account", label: "Account" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=" + encodeURIComponent("/admin"));

    const [{ data: roleRow }, { data: directorRow }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
      supabase.from("directors").select("user_id").eq("user_id", user.id).maybeSingle(),
    ]);
    const role = roleRow?.role ?? null;
    const isDirector = role === "director" || !!directorRow;
    const isAdmin = role === "admin";
    if (!isAdmin && !isDirector) redirect("/no-access");

    const navLinks = isDirector
      ? [
          { href: "/director", label: "← Back to CXO" },
          { href: "/admin/email-macros", label: "Email Macros" },
          { href: "/admin/va-training", label: "VA Training (SOPs)" },
          { href: "/toolbox", label: "VA Toolbox" },
          { href: "/admin/feature-bug", label: "Feature & Bug Log" },
          { href: "/admin/feedback", label: "Request a Feature & Report Bug" },
        ]
      : ADMIN_NAV_LINKS.map((l) => ({ href: l.href, label: l.label }));

    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_name, full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    const displayName =
      (profile?.preferred_name?.trim() || profile?.full_name?.trim() || user?.email || "Account") ?? "Account";
    const safeNavLinks = Array.isArray(navLinks) ? navLinks : [];
    const navLinksForLayout = safeNavLinks.map((l) => ({
      href: typeof l?.href === "string" ? l.href : "/admin",
      label: typeof l?.label === "string" ? l.label : "Dashboard",
    }));

    const drawerFooter = (
      <HeaderUser
        displayName={displayName}
        avatarUrl={profile?.avatar_url ?? undefined}
        title={user?.email ?? undefined}
      />
    );

    return (
      <SidebarLayout
        brandLabel={isDirector ? "CXO" : "CEO"}
        brandHref={isDirector ? "/director" : "/admin"}
        navLinks={navLinksForLayout}
        headerRight={<></>}
        drawerFooter={drawerFooter}
      >
        {children}
      </SidebarLayout>
    );
  } catch (err) {
    const e = err as Error & { digest?: string };
    if (e?.digest?.startsWith?.("NEXT_REDIRECT") || e?.digest?.startsWith?.("NEXT_NOT_FOUND")) throw err;
    console.error("[admin layout]", e);
    redirect("/login?next=" + encodeURIComponent("/admin"));
  }
}
