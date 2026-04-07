import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseRecurringOutreachEvents, VA_STALE_CHECKIN_DAYS } from "@/lib/va/recurring-outreach";
import RecurringOutreachTeamLog from "../../../RecurringOutreachTeamLog";
import CheckinMemberInsights, {
  type CheckinOnboardingRow,
  type CheckinQuizResultRow,
} from "../CheckinMemberInsights";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Bundle = {
  profile?: Record<string, unknown> | null;
  quiz_results?: unknown;
  onboarding?: unknown;
};

export default async function VACheckinMemberProfilePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  if (!UUID_RE.test(memberId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent(`/va/outreach/member/${memberId}`));

  const { data: vaProfile } = await supabase
    .from("va_profiles")
    .select("training_complete")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!vaProfile) redirect("/va/onboarding");
  if (!vaProfile.training_complete) redirect("/va/training");

  const { data: bundleRaw, error: bundleError } = await supabase.rpc("va_get_member_context_for_checkin", {
    p_member_id: memberId,
    p_days: VA_STALE_CHECKIN_DAYS,
  });

  if (bundleError || bundleRaw == null) {
    notFound();
  }

  const bundle = bundleRaw as Bundle;
  if (typeof bundle !== "object" || bundle.profile == null) {
    notFound();
  }
  const profile = bundle.profile;
  if (!profile || typeof profile !== "object") notFound();

  const quizResults = Array.isArray(bundle.quiz_results) ? bundle.quiz_results : [];
  const onboardingList = Array.isArray(bundle.onboarding) ? bundle.onboarding : [];
  const recurringEvents = parseRecurringOutreachEvents(
    (bundle as { recurring_outreach_events?: unknown }).recurring_outreach_events
  );

  const [{ data: customFieldDefs }, { data: recentTickets }] = await Promise.all([
    supabase
      .from("member_profile_custom_field_definitions")
      .select("key, label")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("key", { ascending: true }),
    supabase
      .from("tickets")
      .select("id, subject, status, updated_at")
      .eq("member_id", memberId)
      .order("updated_at", { ascending: false })
      .limit(25),
  ]);

  const displayName =
    (typeof profile.preferred_name === "string" && profile.preferred_name.trim()) ||
    (typeof profile.full_name === "string" && profile.full_name.trim()) ||
    memberId.slice(0, 8);

  return (
    <main className="app-shell">
      <Link href="/va/outreach" className="back-link">
        ← Back to check-ins
      </Link>
      <h1 className="page-title">Member profile (check-in)</h1>
      <p className="ticket-meta" style={{ marginBottom: "var(--space-md)" }}>
        {displayName}
      </p>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)", maxWidth: "42rem" }}>
        Profile, onboarding, and quiz context for suggesting tasks. Only available for members on the quiet list (same window as check-ins).
      </p>

      <RecurringOutreachTeamLog memberId={memberId} initialEvents={recurringEvents} />

      <CheckinMemberInsights
        profile={profile}
        quizResults={quizResults as CheckinQuizResultRow[]}
        onboardingList={onboardingList as CheckinOnboardingRow[]}
        customFieldDefinitions={(customFieldDefs ?? []).map((d) => ({
          key: d.key ?? "",
          label: d.label ?? "",
        }))}
        recentTickets={recentTickets ?? []}
      />

      <p style={{ marginTop: "var(--space-xl)" }}>
        <Link href="/va/outreach" className="btn btn-secondary">
          ← Back to check-ins
        </Link>
      </p>
    </main>
  );
}
