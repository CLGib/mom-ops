import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";
import ClaimTicketButton from "./ClaimTicketButton";
import VAAssignedTaskList from "./VAAssignedTaskList";
import RealtimeAssignedTasks from "./RealtimeAssignedTasks";

export default async function VAPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va"));

  const { data: unassigned } = await supabase
    .from("tickets")
    .select("id, subject, member_id, created_at, requested_va_id")
    .eq("status", "new")
    .is("assigned_va_id", null)
    .order("created_at", { ascending: false });

  const { data: assigned } = await supabase
    .from("tickets")
    .select("id, subject, status, credit_cost, tip_amount, created_at, updated_at")
    .eq("assigned_va_id", user.id)
    .order("updated_at", { ascending: false });

  const { data: completed } = await supabase
    .from("tickets")
    .select("credit_cost, tip_amount")
    .eq("assigned_va_id", user.id)
    .in("status", ["completed", "closed"]);

  const { data: reviewedTickets } = await supabase
    .from("tickets")
    .select("id, subject, rating, feedback, completed_at")
    .eq("assigned_va_id", user.id)
    .not("rating", "is", null)
    .order("completed_at", { ascending: false });

  const VA_PAYOUT_RATE = 0.2;
  const taskEarnings =
    completed?.reduce((sum, t) => sum + (t.credit_cost ?? 0) * VA_PAYOUT_RATE, 0) ?? 0;
  const tipsTotal =
    completed?.reduce((sum, t) => sum + (t.tip_amount ?? 0) / 100, 0) ?? 0;
  const payoutSummary = taskEarnings + tipsTotal;

  const reviewCount = reviewedTickets?.length ?? 0;
  const avgRating =
    reviewCount > 0
      ? (reviewedTickets!.reduce((sum, t) => sum + (t.rating ?? 0), 0) / reviewCount).toFixed(1)
      : null;

  const assignedTicketIds = (assigned ?? []).map((t) => t.id);
  const inProgressTasks = (assigned ?? []).filter(
    (t) => t.status !== "completed" && t.status !== "closed"
  );

  return (
    <main className="app-shell">
      {assignedTicketIds.length > 0 && <RealtimeAssignedTasks assignedTicketIds={assignedTicketIds} />}
      <h1 className="page-title">VA Dashboard</h1>

      {/* 1. Inbox: in-progress tasks first */}
      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Inbox</h2>
        <p className="form-note" style={{ marginTop: "var(--space-2xs)", marginBottom: "var(--space-sm)" }}>
          Reply to these, then claim more below.
        </p>
        {inProgressTasks.length === 0 ? (
          <p className="form-note">Inbox clear. Claim more tasks below when you&apos;re ready.</p>
        ) : (
          <VAAssignedTaskList tickets={inProgressTasks} inboxMode />
        )}
      </section>

      {/* 2. Claim more tasks */}
      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Claim more tasks</h2>
        <ul className="ticket-list">
          {(unassigned ?? []).map((t) => (
            <li key={t.id} className="ticket-item">
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-xs)" }}>
                <Link href={`/va/${t.id}`}>{t.subject}</Link>
                {t.requested_va_id === user.id && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      padding: "0.125rem 0.5rem",
                      borderRadius: 4,
                      backgroundColor: "var(--accent-soft-bg, #f8f5ed)",
                      color: "var(--accent, #b8860b)",
                    }}
                  >
                    Requested you
                  </span>
                )}
                <span className="ticket-meta">
                  {formatInCentral(t.created_at)}
                </span>
              </div>
              <ClaimTicketButton ticketId={t.id} subject={t.subject} />
            </li>
          ))}
        </ul>
      </section>

      {/* 3. Payout, rating, reviews */}
      <section className="card card--highlight" style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Your payout (completed tasks)</h2>
        <p style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text)", margin: "0 0 var(--space-sm)" }}>
          ${payoutSummary.toFixed(2)} total
        </p>
        <p className="ticket-meta" style={{ marginBottom: "var(--space-sm)" }}>
          20% per credit + tips (98% after 2% processing)
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li style={{ marginBottom: "var(--space-xs)" }}>
            <span className="ticket-meta">From tasks:</span>{" "}
            <strong>${taskEarnings.toFixed(2)}</strong>
          </li>
          <li>
            <span className="ticket-meta">From tips (98%):</span>{" "}
            <strong>${tipsTotal.toFixed(2)}</strong>
          </li>
        </ul>
      </section>
      {avgRating != null && (
        <section className="card" style={{ marginBottom: "var(--space-2xl)" }}>
          <h2 className="section-heading">Your rating</h2>
          <p style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text)", margin: "0 0 var(--space-xs)" }}>
            {avgRating} out of 5
          </p>
          <p className="ticket-meta">{reviewCount} review{reviewCount !== 1 ? "s" : ""}</p>
        </section>
      )}
      {reviewCount > 0 && (
        <section style={{ marginBottom: "var(--space-2xl)" }}>
          <h2 className="section-heading">Your reviews</h2>
          <ul className="ticket-list">
            {(reviewedTickets ?? []).map((t) => (
              <li key={t.id} className="ticket-item" style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap" }}>
                  <Link href={`/va/${t.id}`}>{t.subject}</Link>
                  <span className="ticket-meta">{t.rating} of 5</span>
                  {t.completed_at && (
                    <span className="ticket-meta">{formatInCentral(t.completed_at)}</span>
                  )}
                </div>
                {t.feedback && (
                  <blockquote style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-soft, #666)", paddingLeft: "var(--space-sm)", borderLeft: "2px solid var(--border, #e5e5e5)" }}>
                    {t.feedback}
                  </blockquote>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Optional: show closed tasks when there are any */}
      {(() => {
        const closedTasks = (assigned ?? []).filter((t) => t.status === "completed" || t.status === "closed");
        return closedTasks.length > 0 ? (
          <section>
            <h2 className="section-heading">Closed tasks</h2>
            <VAAssignedTaskList tickets={closedTasks} showClosedOnly />
          </section>
        ) : null;
      })()}
    </main>
  );
}
