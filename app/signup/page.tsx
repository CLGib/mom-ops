import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "../login/AuthForm";
import RedirectToDashboard from "../login/RedirectToDashboard";
import OfferCookieSetter from "../(marketing)/components/OfferCookieSetter";
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
  if (path.startsWith("/member")) return role === "member" || role === "admin";
  if (path.startsWith("/va")) return role === "va" || role === "admin";
  if (path.startsWith("/admin")) return role === "admin" || role === "director";
  if (path.startsWith("/director")) return role === "director";
  if (path.startsWith("/cfo")) return role === "cfo";
  return false;
}

export default async function SignupPage({
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
    const target = next && roleCanAccessPath(role, next) ? next : dashboard;
    return <RedirectToDashboard target={target === "/admin" || target === "/admin/" ? "/admin/tasks" : target} />;
  }

  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <div className="app-shell app-shell--narrow">
      <Suspense fallback={null}>
        <OfferCookieSetter />
      </Suspense>
      <h1 className="page-title">Sign up</h1>
      <div className="card">
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <AuthForm defaultMode="magiclink" signupCopy />
        </Suspense>
      </div>
      <p className="form-note" style={{ marginTop: "var(--space-md)", textAlign: "center" }}>
        Already have an account?{" "}
        <Link href={loginHref} className="auth-form-link">
          Log in
        </Link>
      </p>
    </div>
  );
}
