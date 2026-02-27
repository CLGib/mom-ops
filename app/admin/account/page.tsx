import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountSettingsForm from "@/app/components/AccountSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin/account"));

  return (
    <main className="app-shell">
      <h1 className="page-title">Account</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
        Update your email or password.
      </p>
      <AccountSettingsForm initialEmail={user.email ?? ""} />
    </main>
  );
}
