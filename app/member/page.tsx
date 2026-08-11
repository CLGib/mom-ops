import { Suspense } from "react";
import { unstable_noStore } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getTaskByFromTaskParam, getTaskLibrary } from "@/lib/task-library";
import { getSuggestedTasks } from "@/lib/suggested-tasks";
import { getStatusLabel } from "@/lib/ticket-status";
import Link from "next/link";
import ReactivateButton from "./ReactivateButton";
import OnboardingBanner from "./OnboardingBanner";
import ReferralSection from "./ReferralSection";
import ClearReferralCookieOnSuccess from "./ClearReferralCookieOnSuccess";
import CheckoutButton from "../(marketing)/components/CheckoutButton";
import HomeHelperGrid from "./HomeHelperGrid";
import { createTicket } from "./actions";
import { getPostHogClient, shutdownPostHog } from "@/lib/posthog-server";

export const dynamic = "force-dynamic";

export default async function MemberPage({
  searchParams,
}: {
  searchParams: Promise<{
    checkout?: string;
    subject?: string;
    requested_va_id?: string;
    from_review_id?: string;
    category?: string;
    from_specialist?: string;
    from_task?: string;
    freetask_draft?: string;
    freetask_failed?: string;
  }>;
}) {
  unstable_noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const params = await searchParams;
  const checkoutSuccess = params.checkout === "success";
  const creditsSuccess = params.checkout === "credits_success";

  if (!user) redirect("/login?next=" + encodeURIComponent("/member"));

  // ── Back-compat: freetask-draft → ticket on signup return ────────────
  // Preserved exactly. Lands users from the /freetask funnel.
  const freetaskDraftId = params.freetask_draft?.trim();
  if (freetaskDraftId) {
    const service = createServiceClient();
    const { data: draft, error: draftErr } = await service
      .from("freetask_drafts")
      .select("id, email, subject, description, requested_va_id")
      .eq("id", freetaskDraftId)
      .single();

    const draftEmail = draft?.email?.trim().toLowerCase();
    const userEmail = user.email?.trim().toLowerCase();
    const emailMatch = Boolean(draft && userEmail && draftEmail === userEmail);

    if (draftErr || !draft || !emailMatch) {
      redirect("/member?freetask_failed=1");
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token ?? undefined;

    const result = await createTicket(
      draft.subject,
      draft.description ?? null,
      accessToken,
      draft.requested_va_id ?? null,
      undefined,
      undefined,
      false,
      undefined,
      false,
    );

    if (result.error) {
      redirect("/member?freetask_failed=1");
    }

    if (result.ticketId) {
      await service.from("freetask_drafts").delete().eq("id", draft.id);
      try {
        const posthog = getPostHogClient();
        posthog.capture({
          distinctId: user.id,
          event: "freetask_task_created",
          properties: { ticket_id: result.ticketId },
        });
        await shutdownPostHog();
      } catch {
        // best-effort
      }
    }

    redirect("/member");
  }

  // ── Back-compat: legacy ?from_task=… deep link ───────────────────────
  // Old library links would arrive here. Route them straight to the
  // one-click helper flow on /member/helpers instead of falling through
  // to a ticket-creation form (which no longer lives on this page).
  const fromTaskParam = params.from_task?.trim();
  if (fromTaskParam) {
    const helper = await getTaskByFromTaskParam(fromTaskParam);
    if (helper) {
      redirect(`/member/helpers?helper=${encodeURIComponent(helper.id)}`);
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "subscription_status, onboarding_completed_at, preferred_name, full_name, city, state, timezone, partner_name, kids_count, kids_ages, household_members, diet_notes, custom_field_values, is_founding_member, is_free_trial",
    )
    .eq("id", user.id)
    .single();

  const { data: balance } = await supabase.rpc("get_member_balance", {
    p_member_id: user.id,
  });

  const { data: memberTickets } = await supabase
    .from("tickets")
    .select("id, subject, status, created_at, helper_id, completed_at, category")
    .eq("member_id", user.id)
    .order("created_at", { ascending: false });

  const { data: pastTicketsWithSubject } = await supabase
    .from("tickets")
    .select("subject, completed_at, category")
    .eq("member_id", user.id)
    .in("status", ["completed", "closed"])
    .order("completed_at", { ascending: false });

  const taskLibrary = await getTaskLibrary();
  const pastTicketsForSuggestions = (pastTicketsWithSubject ?? []).map((t) => ({
    category: t.category ?? null,
    subject: t.subject ?? null,
  }));
  const suggestedHelpers = getSuggestedTasks(
    profile ?? null,
    pastTicketsForSuggestions,
    taskLibrary,
    { limit: 6 },
  );

  const isActive =
    profile?.subscription_status === "active" || (balance != null && (balance as number) > 0);

  const showOnboardingBanner = profile?.onboarding_completed_at == null;

  const memberFirst = profile?.preferred_name?.trim() || profile?.full_name?.trim()?.split(" ")[0] || null;
  const greetingName = memberFirst ?? "there";

  // Partition tickets into active vs. recently completed.
  const HIDDEN_STATUSES = new Set([
    "cancelled_by_va",
    "cancelled_by_admin",
  ]);
  const ACTIVE_STATUSES = new Set([
    "new",
    "assigned",
    "in_progress",
    "awaiting_member_approval",
    "waiting_on_member",
    "reopened",
  ]);
  const COMPLETED_STATUSES = new Set(["completed", "closed"]);
  const allTickets = (memberTickets ?? []).filter(
    (t) => !HIDDEN_STATUSES.has(t.status),
  );
  const activeHelpers = allTickets.filter((t) => ACTIVE_STATUSES.has(t.status));
  const recentlyCompleted = allTickets
    .filter((t) => COMPLETED_STATUSES.has(t.status))
    .slice(0, 3);

  function displayHelperName(subject: string | null): string {
    const s = (subject ?? "").trim();
    if (!s) return "Helper";
    if (s.toLowerCase().startsWith("helper:")) return s.replace(/^helper:\s*/i, "").trim() || "Helper";
    return s;
  }

  return (
    <main className="app-shell">
      <Suspense fallback={null}>
        <ClearReferralCookieOnSuccess />
      </Suspense>

      <h1 className="page-title">Welcome back, {greetingName}.</h1>

      {showOnboardingBanner && <OnboardingBanner />}

      {checkoutSuccess && isActive && (
        <p
          className="auth-success-message"
          role="status"
          style={{ marginBottom: "var(--space-md)" }}
        >
          Thanks for subscribing. You have unlimited Mom Ops access.
        </p>
      )}

      {creditsSuccess && (
        <p
          className="auth-success-message"
          role="status"
          style={{ marginBottom: "var(--space-md)" }}
        >
          Your credits have been added to your balance.
        </p>
      )}

      {params.freetask_failed === "1" && (
        <p
          className="form-note"
          role="alert"
          style={{
            marginBottom: "var(--space-md)",
            padding: "var(--space-sm) var(--space-md)",
            background: "var(--accent-soft-bg, #f8f5ed)",
            borderRadius: 6,
            borderLeft: "3px solid var(--accent, #b8860b)",
          }}
        >
          We couldn&apos;t bring in your helper from your signup link. Browse
          the library below to try again.
        </p>
      )}

      {profile?.is_free_trial && isActive && (
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          You&apos;re on a free trial — bring in your first helper on us.
        </p>
      )}

      {profile?.is_free_trial &&
        profile?.subscription_status !== "active" &&
        ((balance != null && (balance as number) < 10) ||
          (memberTickets && memberTickets.length >= 1)) && (
          <div
            className="card"
            style={{
              marginBottom: "var(--space-lg)",
              borderColor: "var(--accent)",
            }}
          >
            <p
              className="section-lead"
              style={{ marginBottom: "var(--space-sm)" }}
            >
              You&apos;ve used your free trial. Subscribe for $29.95/month to
              keep bringing in helpers — unlimited access, cancel anytime.
            </p>
            <CheckoutButton className="btn btn-primary">
              Subscribe — $29.95/month
            </CheckoutButton>
          </div>
        )}

      {!isActive && (
        <div
          className="card"
          style={{
            marginBottom: "var(--space-lg)",
            borderColor: "var(--color-border)",
          }}
        >
          <p className="section-lead" style={{ marginBottom: "var(--space-sm)" }}>
            {profile?.is_founding_member
              ? "Your subscription is not active. Reactivate at your founder price ($15.95/month) to bring in helpers."
              : "Your subscription is not active. Reactivate to bring in helpers."}
          </p>
          <ReactivateButton
            isFoundingMember={profile?.is_founding_member === true}
          />
        </div>
      )}

      {/* ── Active helpers ──────────────────────────────────────────── */}
      <section
        id="active-helpers"
        style={{ marginBottom: "var(--space-2xl)" }}
      >
        <h2
          className="section-heading"
          style={{ marginBottom: "var(--space-sm)" }}
        >
          Your active helpers
        </h2>
        {activeHelpers.length === 0 ? (
          <p className="form-note">
            Nothing in motion right now.{" "}
            <Link href="/member/helpers" className="link">
              Browse helpers
            </Link>{" "}
            and bring one in.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {activeHelpers.slice(0, 5).map((t) => (
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "var(--space-md)",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted, #5c5955)",
                        marginRight: "var(--space-sm)",
                      }}
                    >
                      {getStatusLabel(t.status)}
                    </span>
                    <strong>{displayHelperName(t.subject)}</strong>
                  </div>
                  <Link href={`/member/${t.id}`} className="btn btn-primary">
                    View
                  </Link>
                </div>
              </li>
            ))}
            {activeHelpers.length > 5 && (
              <p style={{ marginTop: "var(--space-sm)", marginBottom: 0 }}>
                <Link href="/member/pending" className="link">
                  View all {activeHelpers.length} active
                </Link>
              </p>
            )}
          </ul>
        )}
      </section>

      {/* ── Recently completed ──────────────────────────────────────── */}
      {recentlyCompleted.length > 0 && (
        <section
          id="recently-completed"
          style={{ marginBottom: "var(--space-2xl)" }}
        >
          <h2
            className="section-heading"
            style={{ marginBottom: "var(--space-sm)" }}
          >
            Recently completed
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {recentlyCompleted.map((t) => (
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "var(--space-md)",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted, #5c5955)",
                        marginRight: "var(--space-sm)",
                      }}
                    >
                      Done
                    </span>
                    <strong>{displayHelperName(t.subject)}</strong>
                  </div>
                  <Link href={`/member/${t.id}`} className="btn btn-secondary">
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          <p style={{ marginTop: "var(--space-sm)", marginBottom: 0 }}>
            <Link href="/member/completed" className="link">
              See all completed
            </Link>
          </p>
        </section>
      )}

      {/* ── Suggested helpers (one-click) ───────────────────────────── */}
      {isActive && suggestedHelpers.length > 0 && (
        <section
          id="suggested-helpers"
          style={{ marginBottom: "var(--space-2xl)" }}
        >
          <h2
            className="section-heading"
            style={{ marginBottom: "var(--space-sm)" }}
          >
            Suggested helpers
          </h2>
          <p
            className="form-note"
            style={{ marginBottom: "var(--space-md)" }}
          >
            One click brings them in. We&apos;ll email you back within 24
            hours.
          </p>
          <HomeHelperGrid helpers={suggestedHelpers} />
        </section>
      )}

      {/* ── Browse all helpers CTA ──────────────────────────────────── */}
      {isActive && (
        <section
          id="browse-all"
          style={{ marginBottom: "var(--space-2xl)" }}
        >
          <Link
            href="/member/helpers"
            className="card"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-md)",
              padding: "var(--space-lg) var(--space-xl)",
              textDecoration: "none",
              color: "inherit",
              background: "var(--accent-soft-bg, #f8f5ed)",
              border: "1px solid var(--color-border, #e5e5e5)",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>
                Browse all helpers →
              </h3>
              <p
                className="form-note"
                style={{ marginTop: "var(--space-2xs)", marginBottom: 0 }}
              >
                A library of household helpers, searchable. Bring one in
                whenever you need it.
              </p>
            </div>
          </Link>
        </section>
      )}

      {/* ── Need something custom? (deemphasized) ───────────────────── */}
      {isActive && (
        <section
          id="custom-request"
          style={{ marginBottom: "var(--space-2xl)" }}
        >
          <p className="form-note">
            Need something not in the library?{" "}
            <Link href="/member/custom" className="link" style={{ fontWeight: 500 }}>
              Send a custom request
            </Link>
            {" — or email "}
            <a
              href={`mailto:${process.env.NEXT_PUBLIC_INBOUND_TASK_EMAIL || "task@in.themomops.com"}`}
              className="link"
            >
              {process.env.NEXT_PUBLIC_INBOUND_TASK_EMAIL || "task@in.themomops.com"}
            </a>
            .
          </p>
        </section>
      )}

      {/* ── Referral ────────────────────────────────────────────────── */}
      {isActive && (
        <ReferralSection
          referralLink={`${process.env.NEXT_PUBLIC_SITE_URL || "https://themomops.com"}/?ref=${user.id}`}
        />
      )}

      {/* ── Cancel ──────────────────────────────────────────────────── */}
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

function getCancelMailto(email: string): string {
  const to =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@momops.com";
  const subject = encodeURIComponent("Cancel my Mom Ops subscription");
  const body = encodeURIComponent(
    "I would like to cancel my Mom Ops subscription.\n\nMy email: " +
      (email || "(please add your email)"),
  );
  return `mailto:${to}?subject=${subject}&body=${body}`;
}
