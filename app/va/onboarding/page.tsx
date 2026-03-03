import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VAOnboardingContent from "./VAOnboardingContent";
import MarkOnboardingCompleteButton from "./MarkOnboardingCompleteButton";

export const dynamic = "force-dynamic";

export default async function VAOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va/onboarding"));

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  const isAdmin = roleRow?.role === "admin";

  const { data: vaProfile } = await supabase
    .from("va_profiles")
    .select("onboarding_complete, effective_date, contract_start_date")
    .eq("user_id", user.id)
    .single();

  const alreadyComplete = vaProfile?.onboarding_complete === true;
  const effectiveDate = vaProfile?.effective_date ?? null;
  const contractStartDate = vaProfile?.contract_start_date ?? null;

  return (
    <main className="app-shell">
      <h1 className="page-title">Onboarding</h1>
      {isAdmin ? (
        <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
          You are viewing the VA onboarding guide as CEO. VAs see this page and must mark as read before claiming tasks.
        </p>
      ) : (
        <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
          Read the full Mom Ops VA guide below. When you&apos;re done, confirm and mark as read so you can start claiming tasks.
        </p>
      )}
      <div style={{ overflowY: "auto", maxHeight: "none" }}>
        <VAOnboardingContent />
      </div>
      {!isAdmin && (
        <MarkOnboardingCompleteButton
          alreadyComplete={alreadyComplete}
          effectiveDate={effectiveDate}
          contractStartDate={contractStartDate}
        />
      )}
    </main>
  );
}
