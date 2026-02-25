import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OnboardingSurvey from "./OnboardingSurvey";

export const dynamic = "force-dynamic";

const HELP_OPTIONS = [
  "School & activities",
  "Events & celebrations",
  "Research & comparisons",
  "Household admin",
  "Gifts & sourcing",
] as const;

export type HelpOption = (typeof HELP_OPTIONS)[number];

export default async function MemberOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/member/onboarding"));

  return (
    <main className="app-shell">
      <h1 className="page-title">Quick setup (optional)</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        <Link href="/member" className="link">Skip for now</Link> — you can always complete this later from your profile.
      </p>
      <div className="card">
        <OnboardingSurvey memberId={user.id} helpOptions={[...HELP_OPTIONS]} />
      </div>
    </main>
  );
}
