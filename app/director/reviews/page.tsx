import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export default async function DirectorReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/director"));

  const { data: reviews } = await supabase
    .from("task_reviews")
    .select("id, task_id, member_id, va_id, task_subject, rating, comment, visibility, created_at")
    .order("created_at", { ascending: false });

  const fiveStarCount = (reviews ?? []).filter((r) => r.rating === 5).length;
  const fiveStarBonusTotal = fiveStarCount * 0.5;

  const totalCount = (reviews ?? []).length;

  return (
    <>
      <h1 className="page-title">Reviews</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
        <strong>{totalCount}</strong> review{totalCount !== 1 ? "s" : ""} total. 5-star bonus: $0.50 per verified 5-star review.
      </p>
      <section className="card" style={{ marginBottom: "var(--space-xl)" }}>
        <h2 className="section-heading">5-Star Review Bonus</h2>
        <p style={{ margin: 0 }}>Verified 5-star reviews: <strong>{fiveStarCount}</strong></p>
        <p style={{ margin: "var(--space-xs) 0 0" }}>Calculation: {fiveStarCount} × $0.50 = <strong>${fiveStarBonusTotal.toFixed(2)}</strong></p>
      </section>
      <section className="card">
        <h2 className="section-heading">All reviews</h2>
        <ul className="ticket-list">
          {(reviews ?? []).map((r) => (
            <li key={r.id} className="ticket-item" style={{ flexDirection: "column", alignItems: "flex-start", gap: "var(--space-xs)" }}>
              <span><strong>{r.task_subject}</strong> · {r.rating} of 5 · {r.visibility}</span>
              {r.comment && <span className="form-note">&ldquo;{r.comment}&rdquo;</span>}
              <span className="ticket-meta">{formatInCentral(r.created_at)}</span>
            </li>
          ))}
        </ul>
        {(!reviews || reviews.length === 0) && (
          <p className="form-note">No reviews yet.</p>
        )}
      </section>
    </>
  );
}
