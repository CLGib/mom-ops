import { unstable_noStore } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";
import CreateTicketForm from "./CreateTicketForm";
import ReactivateButton from "./ReactivateButton";
import OnboardingBanner from "./OnboardingBanner";
import MemberTaskList from "./MemberTaskList";

export const dynamic = "force-dynamic";

export default async function MemberPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  unstable_noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const params = await searchParams;
  const checkoutSuccess = params.checkout === "success";

  if (!user) redirect("/login?next=" + encodeURIComponent("/member"));

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, onboarding_completed_at")
    .eq("id", user.id)
    .single();

  const { data: balance } = await supabase.rpc("get_member_balance", {
    p_member_id: user.id,
  });

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, subject, description, status, created_at, completed_at, updated_at")
    .eq("member_id", user.id)
    .order("created_at", { ascending: false });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentlyClosed =
    (tickets ?? []).filter((t) => {
      if (t.status !== "completed" && t.status !== "closed") return false;
      const closedAt = t.completed_at ?? t.updated_at ?? t.created_at;
      return closedAt >= sevenDaysAgo;
    });

  const { data: pastTickets } = await supabase
    .from("tickets")
    .select("assigned_va_id, completed_at")
    .eq("member_id", user.id)
    .not("assigned_va_id", "is", null)
    .in("status", ["completed", "closed"])
    .order("completed_at", { ascending: false });
  const pastVaIdsOrdered = (pastTickets ?? [])
    .map((t) => t.assigned_va_id!)
    .filter(Boolean);
  const pastVaIds = [...new Set(pastVaIdsOrdered)];
  let pastVas: { id: string; label: string; imageUrl?: string | null }[] = [];
  if (pastVaIds.length > 0) {
    const { data: vaPublicProfiles } = await supabase
      .from("va_profiles")
      .select("user_id, display_name, profile_image_url")
      .in("user_id", pastVaIds);
    const vaProfileByUserId = new Map(vaPublicProfiles?.map((v) => [v.user_id, v]) ?? []);
    pastVas = pastVaIds.map((id) => {
      const vp = vaProfileByUserId.get(id);
      return {
        id,
        label: vp?.display_name ?? "Previous specialist",
        imageUrl: vp?.profile_image_url ?? null,
      };
    });
  }

  const isActive =
    profile?.subscription_status === "active" || (balance != null && (balance as number) > 0);

  const showOnboardingBanner = profile?.onboarding_completed_at == null;

  return (
    <main className="app-shell">
      <h1 className="page-title">Member Dashboard</h1>

      {showOnboardingBanner && <OnboardingBanner />}

      {checkoutSuccess && isActive && (
        <p className="auth-success-message" role="status" style={{ marginBottom: "var(--space-md)" }}>
          Thanks for subscribing. You have 45 Task Credits for this month.
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
            Your subscription is not active. Reactivate to submit tasks and use your credits.
          </p>
          <ReactivateButton />
        </div>
      )}

      <p className="member-credits-line" title={isActive ? `Credit Balance: ${balance ?? 0} · Purchase more credits (coming soon)` : undefined}>
        Credit Balance: <strong>{balance ?? 0}</strong>
        {isActive && (
          <>
            {" · "}
            <a href="#" className="link">Purchase more credits</a>
            <span> (coming soon)</span>
          </>
        )}
      </p>

      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>Submit a task</h2>
        <div className="card member-submit-card">
          {isActive ? (
            <>
              <CreateTicketForm memberId={user.id} aiEnabled={!!process.env.ANTHROPIC_API_KEY} pastVas={pastVas} />
              {process.env.NEXT_PUBLIC_INBOUND_TASK_EMAIL && (
                <p className="form-note" style={{ marginTop: "var(--space-md)" }}>
                  You can also email your task to{" "}
                  <a
                    href={`mailto:${process.env.NEXT_PUBLIC_INBOUND_TASK_EMAIL}`}
                    className="link"
                    style={{ fontWeight: 500 }}
                  >
                    {process.env.NEXT_PUBLIC_INBOUND_TASK_EMAIL}
                  </a>{" "}
                  (or forward an email to that address).
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

      {recentlyClosed.length > 0 && (
        <section style={{ marginBottom: "var(--space-2xl)" }}>
          <h2 className="section-heading">Recently closed (last 7 days)</h2>
          <ul className="ticket-list">
            {recentlyClosed.map((t) => (
              <li key={t.id} className="ticket-item">
                <Link href={`/member/${t.id}`}>{t.subject}</Link>
                <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)" }}>
                  {formatInCentral(t.completed_at ?? t.updated_at ?? t.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Your tasks</h2>
        <MemberTaskList tickets={tickets ?? []} />
      </section>

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
          {" — we’ll process your request by email."}
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
      (email || "(please add your email)")
  );
  return `mailto:${to}?subject=${subject}&body=${body}`;
}
