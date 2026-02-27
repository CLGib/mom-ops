import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VAProfileForm from "../VAProfileForm";
import AccountSettingsForm from "@/app/components/AccountSettingsForm";

export const dynamic = "force-dynamic";

export default async function VAProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va/profile"));

  const { data: vaProfile } = await supabase
    .from("va_profiles")
    .select("display_name, profile_image_url, bio")
    .eq("user_id", user.id)
    .single();

  const initial = {
    display_name: vaProfile?.display_name ?? user.email?.split("@")[0] ?? "VA",
    profile_image_url: vaProfile?.profile_image_url ?? null,
    bio: vaProfile?.bio ?? "",
  };

  return (
    <main className="app-shell">
      <h1 className="page-title">Profile &amp; account</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Update your display name, bio, and profile photo (shown to members). You can also change your email and password below.
      </p>

      <section style={{ marginBottom: "var(--space-xl)" }}>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>Public profile</h2>
        <VAProfileForm vaUserId={user.id} initial={initial} />
      </section>

      <section>
        <AccountSettingsForm initialEmail={user.email ?? ""} />
      </section>
    </main>
  );
}
