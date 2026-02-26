import { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthForm from "./AuthForm";
import { createClient } from "@/lib/supabase/server";

type Role = "member" | "va" | "admin";

function dashboardForRole(role: Role): string {
  return role === "member" ? "/member" : role === "va" ? "/va" : "/admin";
}

function roleCanAccessPath(role: Role, path: string): boolean {
  if (path.startsWith("/member")) return role === "member" || role === "admin";
  if (path.startsWith("/va")) return role === "va" || role === "admin";
  if (path.startsWith("/admin")) return role === "admin";
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
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .maybeSingle();
    const role = (roleRow?.role as Role | undefined) ?? null;

    if (!role || !["member", "va", "admin"].includes(role)) {
      redirect("/login?error=role_not_set");
    }

    const params = await searchParams;
    const next = typeof params.next === "string" ? params.next : undefined;
    const dashboard = dashboardForRole(role);
    const target =
      next && roleCanAccessPath(role, next) ? next : dashboard;
    redirect(target);
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
