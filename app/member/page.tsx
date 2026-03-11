import { Suspense } from "react";
import { unstable_noStore } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTaskByFromTaskParam, getTaskLibrary } from "@/lib/task-library";
import { fillTaskTemplate } from "@/lib/fill-task-template";
import { getSuggestedTasks } from "@/lib/suggested-tasks";
import { getStatusLabel } from "@/lib/ticket-status";
import Link from "next/link";
import CreateTicketForm from "./CreateTicketForm";
import ReactivateButton from "./ReactivateButton";
import OnboardingBanner from "./OnboardingBanner";
import ExploreTasksLibrary from "../components/ExploreTasksLibrary";
import ReferralSection from "./ReferralSection";
import ClearReferralCookieOnSuccess from "./ClearReferralCookieOnSuccess";

export const dynamic = "force-dynamic";

export default async function MemberPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; subject?: string; requested_va_id?: string; from_review_id?: string; category?: string; from_specialist?: string; from_task?: string }>;
}) {
  unstable_noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const params = await searchParams;
  const checkoutSuccess = params.checkout === "success";
  const creditsSuccess = params.checkout === "credits_success";
  const fromReviewSubject = params.subject ?? undefined;
  const fromReviewVaId = params.requested_va_id ?? undefined;
  const fromReviewId = params.from_review_id ?? undefined;
  const fromReviewCategory = params.category ?? undefined;
  const fromSpecialistProfile = params.from_specialist === "1";
  const fromTask = params.from_task != null ? await getTaskByFromTaskParam(params.from_task) : null;

  if (!user) redirect("/login?next=" + encodeURIComponent("/member"));

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, onboarding_completed_at, preferred_name, full_name, city, state, timezone, partner_name, kids_count, kids_ages, household_members, diet_notes, custom_field_values, is_founding_member")
    .eq("id", user.id)
    .single();

  const initialDescription =
    fromTask?.template && profile
      ? fillTaskTemplate(fromTask.template, profile)
      : fromTask?.template;

  const { data: balance } = await supabase.rpc("get_member_balance", {
    p_member_id: user.id,
  });

  const { data: memberTickets } = await supabase
    .from("tickets")
    .select("id, subject, status, created_at")
    .eq("member_id", user.id)
    .order("created_at", { ascending: false });

  const { data: pastTicketsWithSubject } = await supabase
    .from("tickets")
    .select("assigned_va_id, subject, completed_at, category")
    .eq("member_id", user.id)
    .not("assigned_va_id", "is", null)
    .in("status", ["completed", "closed"])
    .order("completed_at", { ascending: false });
  const pastVaIdsOrdered = (pastTicketsWithSubject ?? [])
    .map((t) => t.assigned_va_id!)
    .filter(Boolean);
  const pastVaIds = [...new Set(pastVaIdsOrdered)];
  const subjectByVaId = new Map<string, string>();
  for (const t of pastTicketsWithSubject ?? []) {
    if (t.assigned_va_id && !subjectByVaId.has(t.assigned_va_id)) {
      subjectByVaId.set(t.assigned_va_id, (t.subject && String(t.subject).trim()) || "previous task");
    }
  }
  const pastVas: { id: string; label: string; imageUrl?: string | null }[] = pastVaIds.map((vaId) => ({
    id: vaId,
    label: `Same specialist as "${subjectByVaId.get(vaId) ?? "previous task"}"`,
    imageUrl: null,
  }));

  const taskLibrary = await getTaskLibrary();
  const categories = [...new Set(taskLibrary.map((t) => t.category))].sort();
  const pastTicketsForSuggestions = (pastTicketsWithSubject ?? []).map((t) => ({
    category: t.category ?? null,
    subject: t.subject ?? null,
  }));
  const suggestedTasks = getSuggestedTasks(profile ?? null, pastTicketsForSuggestions, taskLibrary, { limit: 8 });

  let fromReviewVaName: string | null = null;
  let requestedVaUnavailable = false;
  if (fromReviewVaId?.trim()) {
    const { data: vaProfile } = await supabase
      .from("va_profiles")
      .select("display_name, onboarding_complete")
      .eq("user_id", fromReviewVaId.trim())
      .single();
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_name, full_name")
      .eq("id", fromReviewVaId.trim())
      .single();
    fromReviewVaName =
      (vaProfile?.display_name ?? profile?.preferred_name ?? profile?.full_name)?.trim() ?? null;
    requestedVaUnavailable = vaProfile?.onboarding_complete === false;
  }

  const isActive =
    profile?.subscription_status === "active" || (balance != null && (balance as number) > 0);

  const showOnboardingBanner = profile?.onboarding_completed_at == null;

  return (
    <main className="app-shell">
      <Suspense fallback={null}>
        <ClearReferralCookieOnSuccess />
      </Suspense>
      <h1 className="page-title">My Ops Hub</h1>

      {showOnboardingBanner && <OnboardingBanner />}

      {checkoutSuccess && isActive && (
        <p className="auth-success-message" role="status" style={{ marginBottom: "var(--space-md)" }}>
          Thanks for subscribing. You have 35 Task Credits for this month.
        </p>
      )}

      {creditsSuccess && (
        <p className="auth-success-message" role="status" style={{ marginBottom: "var(--space-md)" }}>
          Your credits have been added to your balance.
        </p>
      )}

      {checkoutSuccess === false && params.checkout === "cancel" && (
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          Checkout was canceled. You can reactivate anytime from this dashboard.
        </p>
      )}

      {!isActive && (
        <div className="card" style={{ marginBottom: "var(--space-lg)", borderColor: "var(--color-border)" }}>
          <p className="section-lead" style={{ marginBottom: "var(--space-sm)" }}>
            {profile?.is_founding_member
              ? "Your subscription is not active. Reactivate at your founder price ($15.95/month) to submit tasks and use your credits."
              : "Your subscription is not active. Reactivate to submit tasks and use your credits."}
          </p>
          <ReactivateButton isFoundingMember={profile?.is_founding_member === true} />
        </div>
      )}

      <p className="member-credits-line" title={isActive ? `Credit Balance: ${balance ?? 0} · Purchase more credits` : undefined}>
        Credit Balance: <strong>{balance ?? 0}</strong>
        {isActive && (
          <>
            {" · "}
            <a href="/member/credits" className="link">Purchase more credits</a>
          </>
        )}
      </p>

      <section id="your-tasks" style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>Your tasks</h2>
        <MemberTasksPreview tickets={memberTickets ?? []} />
      </section>

      <section id="submit" style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>Submit a task</h2>
        <div className="card member-submit-card">
          {isActive ? (
            <>
              <CreateTicketForm
                memberId={user.id}
                aiEnabled={!!process.env.ANTHROPIC_API_KEY}
                pastVas={pastVas}
                initialSubject={fromTask?.task ?? fromReviewSubject}
                initialDescription={initialDescription}
                initialRequestedVaId={fromReviewVaId}
                initialCategory={fromTask?.category ?? fromReviewCategory}
                fromReviewId={fromReviewId}
                fromReviewVaName={fromReviewVaName}
                fromSpecialistProfile={fromSpecialistProfile}
                requestedVaUnavailable={requestedVaUnavailable}
              />
              {(process.env.NEXT_PUBLIC_INBOUND_TASK_EMAIL || true) && (
                <p className="form-note" style={{ marginTop: "var(--space-md)" }}>
                  You can also email your task to{" "}
                  <a
                    href={`mailto:${process.env.NEXT_PUBLIC_INBOUND_TASK_EMAIL || "task@in.themomops.com"}`}
                    className="link"
                    style={{ fontWeight: 500 }}
                  >
                    {process.env.NEXT_PUBLIC_INBOUND_TASK_EMAIL || "task@in.themomops.com"}
                  </a>{" "}
                  (or forward an email to that address). Maybe add this email to your contacts too.
                </p>
              )}
            </>
          ) : (
            <p className="form-note">
              Reactivate your subscription above to submit tasks.
            </p>
          )}
        </div>
      </section>

      {isActive && suggestedTasks.length > 0 && (
        <section id="suggested-for-you" style={{ marginBottom: "var(--space-2xl)" }}>
          <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>Suggested for you</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, maxWidth: 720 }}>
            {suggestedTasks.map((t) => (
              <li
                key={t.id}
                style={{
                  padding: "var(--space-md)",
                  marginBottom: "var(--space-sm)",
                  border: "1px solid var(--color-border, #e5e5e5)",
                  borderRadius: "var(--radius, 6px)",
                  backgroundColor: "var(--color-bg, #fff)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-md)", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted, #5c5955)",
                        display: "block",
                        marginBottom: "var(--space-2xs)",
                      }}
                    >
                      {t.category}
                    </span>
                    <strong style={{ fontSize: "1rem" }}>{t.task}</strong>
                    <span
                      style={{
                        marginLeft: "var(--space-sm)",
                        fontSize: "0.875rem",
                        color: "var(--accent, #b8860b)",
                        fontWeight: 600,
                      }}
                    >
                      ~{t.credits} credit{t.credits !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <Link
                    href={`/member?from_task=${t.id}#submit`}
                    className="btn btn-primary"
                    style={{ flexShrink: 0 }}
                  >
                    Create task
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isActive && (
        <section id="explore-tasks" style={{ marginBottom: "var(--space-2xl)" }}>
          <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>Explore tasks</h2>
          <ExploreTasksLibrary tasks={taskLibrary} categories={categories} mode="member" />
        </section>
      )}

      {isActive && (
        <ReferralSection
          referralLink={`${process.env.NEXT_PUBLIC_SITE_URL || "https://themomops.com"}/?ref=${user.id}`}
        />
      )}

      <section>
        <p className="form-note">
          <a
            href={getCancelMailto(user.email ?? "")}
            className="link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Cancel subscription
          </a>
          {" . We’ll process your request by email."}
        </p>
      </section>
    </main>
  );
}

const HIDDEN_STATUSES = ["closed", "cancelled_by_va", "cancelled_by_admin"] as const;

function MemberTasksPreview({
  tickets,
}: {
  tickets: { id: string; subject: string; status: string; created_at: string }[];
}) {
  const visible = tickets.filter((t) => !HIDDEN_STATUSES.includes(t.status as (typeof HIDDEN_STATUSES)[number]));
  const preview = visible.slice(0, 5);
  if (tickets.length === 0) {
    return (
      <p className="form-note">
        No tasks yet.{" "}
        <Link href="/member#submit" className="link">Submit a task</Link> below when your subscription is active.
      </p>
    );
  }
  return (
    <div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {preview.map((t) => (
          <li
            key={t.id}
            style={{
              padding: "var(--space-md)",
              marginBottom: "var(--space-sm)",
              border: "1px solid var(--color-border, #e5e5e5)",
              borderRadius: "var(--radius, 6px)",
              backgroundColor: "var(--color-bg, #fff)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-md)", flexWrap: "wrap" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted, #5c5955)", marginRight: "var(--space-sm)" }}>
                  {getStatusLabel(t.status)}
                </span>
                <strong>{t.subject || "Task"}</strong>
              </div>
              <Link href={`/member/${t.id}`} className="btn btn-primary">
                View
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: "var(--space-sm)", marginBottom: 0 }}>
        <Link href="/member/pending" className="link">View all tasks</Link>
        {visible.length > 5 && ` (${visible.length} open)`}
      </p>
    </div>
  );
}

function getCancelMailto(email: string): string {
  const to =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@momops.com";
  const subject = encodeURIComponent("Cancel my Mom Ops subscription");
  const body = encodeURIComponent(
    "I would like to cancel my Mom Ops subscription.\n\nMy email: " +
      (email || "(please add your email)")
  );
  return `mailto:${to}?subject=${subject}&body=${body}`;
}
