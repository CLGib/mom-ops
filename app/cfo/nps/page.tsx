import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export default async function CfoNPSPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/cfo"));

  const { data: npsRows } = await supabase
    .from("nps_responses")
    .select("id, user_id, score, comment, created_at")
    .eq("dismissed", false)
    .not("score", "is", null)
    .order("created_at", { ascending: false });

  const npsScores = (npsRows ?? []).map((r) => r.score as number).filter((s) => s >= 0 && s <= 10);
  const npsResponseCount = npsScores.length;
  const npsPromoters = npsScores.filter((s) => s >= 9).length;
  const npsPassives = npsScores.filter((s) => s >= 7 && s <= 8).length;
  const npsDetractors = npsScores.filter((s) => s <= 6).length;
  const npsScore = npsResponseCount > 0 ? Math.round(((npsPromoters - npsDetractors) / npsResponseCount) * 100) : null;
  const npsAvg = npsResponseCount > 0 ? (npsScores.reduce((a, b) => a + b, 0) / npsResponseCount).toFixed(1) : null;

  return (
    <>
      <h1 className="page-title">NPS</h1>
      <section className="card card--highlight" style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Overview</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)", marginBottom: "var(--space-lg)" }}>
          <div className="card" style={{ padding: "var(--space-md)", minWidth: "120px" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>NPS score</p>
            <p style={{ fontSize: "1.75rem", fontWeight: 600, margin: 0 }}>{npsScore != null ? npsScore : "-"}</p>
          </div>
          <div className="card" style={{ padding: "var(--space-md)", minWidth: "120px" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>Responses</p>
            <p style={{ fontSize: "1.75rem", fontWeight: 600, margin: 0 }}>{npsResponseCount}</p>
          </div>
          <div className="card" style={{ padding: "var(--space-md)", minWidth: "120px" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>Avg score</p>
            <p style={{ fontSize: "1.75rem", fontWeight: 600, margin: 0 }}>{npsAvg ?? "-"}</p>
          </div>
          <div className="card" style={{ padding: "var(--space-md)", minWidth: "140px" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>Promoters / Passives / Detractors</p>
            <p style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{npsPromoters} / {npsPassives} / {npsDetractors}</p>
          </div>
        </div>
      </section>
      <section>
        <h2 className="section-heading">Recent responses</h2>
        {npsRows && npsRows.length > 0 ? (
          <ul className="ticket-list" style={{ listStyle: "none", padding: 0 }}>
            {npsRows.map((r) => (
              <li key={r.id} className="card" style={{ padding: "var(--space-md)", marginBottom: "var(--space-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-sm)" }}>
                  <span style={{ fontWeight: 600, marginRight: "var(--space-sm)" }}>{r.score}/10</span>
                  <span className="form-note" style={{ fontSize: "0.85rem" }}>{formatInCentral(r.created_at)}</span>
                </div>
                {r.comment && <p style={{ margin: "var(--space-xs) 0 0", fontSize: "0.9rem" }}>{r.comment}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="form-note">No NPS responses yet.</p>
        )}
      </section>
    </>
  );
}
