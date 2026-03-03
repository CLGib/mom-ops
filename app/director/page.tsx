import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export default async function DirectorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/director"));

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, created_at, completed_at, status, rating, assigned_va_id, updated_at");

  const ticketsThisMonth = (tickets ?? []).filter((t) => new Date(t.created_at) >= monthStart);
  const newTasksCount = ticketsThisMonth.length;
  const completedTickets = (tickets ?? []).filter(
    (t) => t.status === "completed" || t.status === "closed"
  );
  const tasksCompletedCount = completedTickets.length;

  const withRating = completedTickets.filter((t) => t.rating != null);
  const avgRating =
    withRating.length > 0
      ? (withRating.reduce((s, t) => s + (t.rating ?? 0), 0) / withRating.length).toFixed(1)
      : null;
  const fiveStarCount = withRating.filter((t) => t.rating === 5).length;
  const flaggedRatings = withRating.filter((t) => (t.rating ?? 0) <= 3);

  const { data: taskReviews } = await supabase
    .from("task_reviews")
    .select("id, rating, created_at")
    .eq("visibility", "public");
  const fiveStarReviewsCount = (taskReviews ?? []).filter((r) => r.rating === 5).length;
  const totalReviewsCount = (taskReviews ?? []).length;

  const { data: npsRows } = await supabase
    .from("nps_responses")
    .select("score, dismissed")
    .eq("dismissed", false)
    .not("score", "is", null);
  const npsScores = (npsRows ?? []).map((r) => r.score as number).filter((s) => s >= 0 && s <= 10);
  const npsResponseCount = npsScores.length;
  const npsPromoters = npsScores.filter((s) => s >= 9).length;
  const npsDetractors = npsScores.filter((s) => s <= 6).length;
  const npsScore =
    npsResponseCount > 0
      ? Math.round(((npsPromoters - npsDetractors) / npsResponseCount) * 100)
      : null;
  const { data: directorAdjustments } = await supabase
    .from("director_adjustments")
    .select("bucket, amount_cents")
    .eq("director_id", user.id);
  const { data: directorPayments } = await supabase
    .from("director_payments")
    .select("bucket, amount_cents")
    .eq("director_id", user.id);

  const BUCKETS = ["five_star", "nps_bonus", "ceo_bonus", "va_onboarded", "ticket_pay", "tips"] as const;
  const bucketBalance: Record<string, number> = {};
  BUCKETS.forEach((b) => { bucketBalance[b] = 0; });
  (directorAdjustments ?? []).forEach((a) => {
    if (bucketBalance[a.bucket] !== undefined) bucketBalance[a.bucket] += a.amount_cents / 100;
  });
  (directorPayments ?? []).forEach((p) => {
    if (bucketBalance[p.bucket] !== undefined) bucketBalance[p.bucket] -= p.amount_cents / 100;
  });
  const totalOwed = Object.values(bucketBalance).reduce((s, v) => s + (v > 0 ? v : 0), 0);

  const assignedTickets = (tickets ?? []).filter((t) => t.assigned_va_id != null);
  let timeToClaimHours: number | null = null;
  if (assignedTickets.length > 0) {
    const claimDeltas = assignedTickets
      .map((t) => {
        const created = new Date(t.created_at).getTime();
        const updated = new Date(t.updated_at ?? t.created_at).getTime();
        return (updated - created) / (1000 * 60 * 60);
      })
      .filter((h) => h >= 0 && h < 24 * 365);
    if (claimDeltas.length > 0) {
      timeToClaimHours =
        claimDeltas.reduce((a, b) => a + b, 0) / claimDeltas.length;
    }
  }

  return (
    <>
      <h1 className="page-title">CXO Dashboard</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-xl)" }}>
        Experience &amp; Operations — KPIs and pay at a glance.
      </p>

      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">KPIs</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "var(--space-md)",
          }}
        >
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>Five-star reviews</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>{fiveStarReviewsCount}</p>
          </div>
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>Tasks completed</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>{tasksCompletedCount}</p>
          </div>
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>Time to claim (avg hrs)</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
              {timeToClaimHours != null ? timeToClaimHours.toFixed(1) : "—"}
            </p>
          </div>
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>New tasks (this month)</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>{newTasksCount}</p>
          </div>
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>Average rating</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
              {avgRating ?? "—"} {avgRating != null ? "/ 5" : ""}
            </p>
          </div>
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>NPS score</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
              {npsScore != null ? npsScore : "—"}
              {npsResponseCount > 0 && (
                <span className="form-note" style={{ fontSize: "0.8rem", marginLeft: "var(--space-xs)" }}>
                  ({npsResponseCount} response{npsResponseCount !== 1 ? "s" : ""})
                </span>
              )}
            </p>
            <Link href="/director/nps" className="link" style={{ fontSize: "0.8rem", marginTop: "var(--space-xs)", display: "inline-block" }}>
              View NPS →
            </Link>
          </div>
        </div>
      </section>

      {flaggedRatings.length > 0 && (
        <section style={{ marginBottom: "var(--space-2xl)" }}>
          <h2 className="section-heading">Flagged ratings (≤ 3 — investigate)</h2>
          <ul className="ticket-list">
            {flaggedRatings.slice(0, 20).map((t) => (
              <li key={t.id} className="ticket-item">
                <Link href={`/admin/${t.id}`}>Task · {t.rating} of 5</Link>
                <span className="ticket-meta">
                  {t.completed_at ? formatInCentral(t.completed_at) : "—"}
                </span>
                <Link href={`/admin/${t.id}`} className="btn btn-secondary">View</Link>
              </li>
            ))}
          </ul>
          {flaggedRatings.length > 20 && (
            <p className="form-note">Showing 20 of {flaggedRatings.length}. Open a task to investigate.</p>
          )}
        </section>
      )}

      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Pay overview</h2>
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          Balances by bucket (earned − paid). CEO adds credits and records payouts on the Payouts page.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "var(--space-md)",
          }}
        >
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>5 Star (review bonus)</p>
            <p style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>${(bucketBalance.five_star ?? 0).toFixed(2)}</p>
            <p className="form-note" style={{ margin: "var(--space-2xs) 0 0", fontSize: "0.75rem" }}>${(fiveStarReviewsCount * 0.5).toFixed(2)} suggested</p>
          </div>
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>NPS bonus</p>
            <p style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>${(bucketBalance.nps_bonus ?? 0).toFixed(2)}</p>
          </div>
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>CEO bonus</p>
            <p style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>${(bucketBalance.ceo_bonus ?? 0).toFixed(2)}</p>
          </div>
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>VA onboarded</p>
            <p style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>${(bucketBalance.va_onboarded ?? 0).toFixed(2)}</p>
          </div>
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>Ticket pay</p>
            <p style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>${(bucketBalance.ticket_pay ?? 0).toFixed(2)}</p>
          </div>
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>Tips</p>
            <p style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>${(bucketBalance.tips ?? 0).toFixed(2)}</p>
          </div>
        </div>
        <div className="card" style={{ marginTop: "var(--space-md)", padding: "var(--space-md)" }}>
          <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>Total owed</p>
          <p style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>${totalOwed.toFixed(2)}</p>
        </div>
      </section>

      <section>
        <h2 className="section-heading">Reviews</h2>
        <p style={{ margin: 0 }}>
          <strong>{totalReviewsCount}</strong> review{totalReviewsCount !== 1 ? "s" : ""} total.
          <Link href="/director/reviews" className="link" style={{ marginLeft: "var(--space-sm)" }}>
            View reviews →
          </Link>
        </p>
      </section>
    </>
  );
}
