import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CfoDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/cfo"));

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

  return (
    <>
      <h1 className="page-title">CFO Dashboard</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-xl)" }}>
        Financial overview - revenue, expenses, VA pay, NPS, and exports.
      </p>

      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Quick links</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "var(--space-md)",
          }}
        >
          <Link href="/cfo/vas" className="card" style={{ padding: "var(--space-md)", textDecoration: "none", color: "inherit" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>VAs</p>
            <p style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>Pay &amp; payout info</p>
            <p className="form-note" style={{ marginTop: "var(--space-xs)", marginBottom: 0, fontSize: "0.8rem" }}>Wise, PayPal, earnings</p>
          </Link>
          <Link href="/cfo/revenue" className="card" style={{ padding: "var(--space-md)", textDecoration: "none", color: "inherit" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>Revenue</p>
            <p style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>Full revenue dashboard</p>
            <p className="form-note" style={{ marginTop: "var(--space-xs)", marginBottom: 0, fontSize: "0.8rem" }}>Stripe, costs, profit</p>
          </Link>
          <Link href="/cfo/expenses" className="card" style={{ padding: "var(--space-md)", textDecoration: "none", color: "inherit" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>Expenses</p>
            <p style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>Upload expenses</p>
            <p className="form-note" style={{ marginTop: "var(--space-xs)", marginBottom: 0, fontSize: "0.8rem" }}>CSV bulk import</p>
          </Link>
          <Link href="/cfo/export" className="card" style={{ padding: "var(--space-md)", textDecoration: "none", color: "inherit" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>Export</p>
            <p style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>Export data</p>
            <p className="form-note" style={{ marginTop: "var(--space-xs)", marginBottom: 0, fontSize: "0.8rem" }}>Tips, costs, CSV</p>
          </Link>
          <Link href="/cfo/nps" className="card" style={{ padding: "var(--space-md)", textDecoration: "none", color: "inherit" }}>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>NPS</p>
            <p style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>NPS score</p>
            <p className="form-note" style={{ marginTop: "var(--space-xs)", marginBottom: 0, fontSize: "0.8rem" }}>{npsResponseCount} responses</p>
          </Link>
        </div>
      </section>

      <section className="card" style={{ padding: "var(--space-lg)" }}>
        <h2 className="section-heading">NPS at a glance</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)", alignItems: "center" }}>
          <div>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)" }}>NPS score</p>
            <p style={{ fontSize: "2rem", fontWeight: 600, margin: 0 }}>{npsScore != null ? npsScore : "-"}</p>
          </div>
          <div>
            <p className="form-note" style={{ margin: "0 0 var(--space-xs)" }}>Responses</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>{npsResponseCount}</p>
          </div>
          <Link href="/cfo/nps" className="btn btn-secondary">View NPS details →</Link>
        </div>
      </section>
    </>
  );
}
