import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountSettingsForm from "../../components/AccountSettingsForm";
import ProfileNameForm from "../../components/ProfileNameForm";
import PublicProfileForm from "../../member/profile/PublicProfileForm";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin/account"));

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, preferred_name, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <main className="app-shell">
      <h1 className="page-title">Account</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Update your name, profile image, email, and password.
      </p>

      <ProfileNameForm
        initialFullName={profile?.full_name ?? null}
        initialPreferredName={profile?.preferred_name ?? null}
      />

      <PublicProfileForm
        memberId={user.id}
        initialDisplayName={profile?.display_name ?? null}
        initialAvatarUrl={profile?.avatar_url ?? null}
      />

      <section className="card">
        <h2 className="section-heading">Email &amp; password</h2>
        <AccountSettingsForm initialEmail={user.email ?? ""} />
      </section>
    </main>
  );
}
