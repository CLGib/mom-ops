import { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthForm from "./AuthForm";
import RedirectToDashboard from "./RedirectToDashboard";
import { createClient } from "@/lib/supabase/server";

type Role = "member" | "va" | "admin" | "director" | "cfo";

function dashboardForRole(role: Role): string {
  if (role === "member") return "/member";
  if (role === "va") return "/va";
  if (role === "director") return "/director";
  if (role === "cfo") return "/cfo";
  return "/admin/tasks";
}

function roleCanAccessPath(role: Role, path: string): boolean {
  if (path.startsWith("/welcome")) return true;
  if (path.startsWith("/member")) return role === "member" || role === "admin";
  if (path.startsWith("/va")) return role === "va" || role === "admin";
  if (path.startsWith("/admin")) return role === "admin" || role === "director";
  if (path.startsWith("/director")) return role === "director";
  if (path.startsWith("/cfo")) return role === "cfo";
  return false;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: roleRow, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    const role = (roleRow?.role as Role | undefined) ?? null;

    if (roleErr || !role || !["member", "va", "admin", "director", "cfo"].includes(role)) {
      redirect("/no-access?reason=role_not_set");
    }

    const params = await searchParams;
    const next = typeof params.next === "string" ? params.next : undefined;
    const dashboard = dashboardForRole(role);
    let target = next && roleCanAccessPath(role, next) ? next : dashboard;
    if (target === "/admin" || target === "/admin/") target = "/admin/tasks";
    // Client-side redirect so the browser sends cookies on the next request (avoids redirect loop)
    return <RedirectToDashboard target={target} />;
  }

  return (
    <div className="app-shell app-shell--narrow">
      <h1 className="page-title">Mom Ops</h1>
      <div className="card">
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
