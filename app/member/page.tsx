import { unstable_noStore } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CreateTicketForm from "./CreateTicketForm";
import ReactivateButton from "./ReactivateButton";

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
  if (!user) redirect("/login?next=" + encodeURIComponent("/member"));

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  const { data: balance } = await supabase.rpc("get_member_balance", {
    p_member_id: user.id,
  });

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, subject, status, created_at")
    .eq("member_id", user.id)
    .order("created_at", { ascending: false });

  const isActive =
    profile?.subscription_status === "active" || (balance != null && (balance as number) > 0);
  const params = await searchParams;
  const checkoutSuccess = params.checkout === "success";

  return (
    <main className="app-shell">
      <h1 className="page-title">Member Dashboard</h1>

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

      <p className="section-lead" style={{ marginBottom: "var(--space-md)" }}>
        Credit Balance: <strong>{balance ?? 0}</strong>
        {isActive && (
          <>
            {" · "}
            <a href="#" className="link">Purchase more credits</a>
            <span className="form-note" style={{ marginLeft: "var(--space-xs)" }}>(coming soon)</span>
          </>
        )}
      </p>

      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Submit a task</h2>
        <div className="card">
          {isActive ? (
            <>
              <CreateTicketForm memberId={user.id} />
              {process.env.NEXT_PUBLIC_INBOUND_TASK_EMAIL && (
                <p className="form-note" style={{ marginTop: "var(--space-md)" }}>
                  You can also email your task to{" "}
                  <strong>{process.env.NEXT_PUBLIC_INBOUND_TASK_EMAIL}</strong>{" "}
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

      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Your tasks</h2>
        {(tickets ?? []).length === 0 ? (
          <p className="form-note">No tasks yet. Submit one above when your subscription is active.</p>
        ) : (
          <ul className="ticket-list">
            {(tickets ?? []).map((t) => (
              <li key={t.id} className="ticket-item">
                <div>
                  <Link href={`/member/${t.id}`}>{t.subject}</Link>
                  <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)" }}>
                    {t.status} – {new Date(t.created_at).toLocaleString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
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
