import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VAProfileForm from "../VAProfileForm";
import VAPaymentContractForm from "../VAPaymentContractForm";
import AccountSettingsForm from "../../components/AccountSettingsForm";

export const dynamic = "force-dynamic";

export default async function VAProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va/profile"));

  const { data: vaProfile } = await supabase
    .from("va_profiles")
    .select("display_name, profile_image_url, bio, payment_method, payment_account, legal_name, email_address, effective_date, contract_start_date, address, mobile_phone")
    .eq("user_id", user.id)
    .single();

  const profileInitial = {
    display_name: vaProfile?.display_name ?? user.email?.split("@")[0] ?? "VA",
    profile_image_url: vaProfile?.profile_image_url ?? null,
    bio: vaProfile?.bio ?? "",
  };

  const paymentInitial = {
    payment_method: vaProfile?.payment_method ?? null,
    payment_account: vaProfile?.payment_account ?? null,
    legal_name: vaProfile?.legal_name ?? null,
    email_address: vaProfile?.email_address ?? null,
    effective_date: vaProfile?.effective_date ?? null,
    contract_start_date: vaProfile?.contract_start_date ?? null,
    address: vaProfile?.address ?? null,
    mobile_phone: vaProfile?.mobile_phone ?? null,
  };

  return (
    <main className="app-shell">
      <h1 className="page-title">Profile &amp; account</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Update your display name, bio, and profile photo (shown to members). Add payment and contract details below. You can also change your email and password at the bottom.
      </p>

      <section style={{ marginBottom: "var(--space-xl)" }}>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>Public profile</h2>
        <VAProfileForm vaUserId={user.id} initial={profileInitial} />
      </section>

      <section style={{ marginBottom: "var(--space-xl)" }}>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>Payment &amp; contract</h2>
        <VAPaymentContractForm vaUserId={user.id} initial={paymentInitial} />
      </section>

      <section>
        <AccountSettingsForm initialEmail={user.email ?? ""} />
      </section>
    </main>
  );
}
