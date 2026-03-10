import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";
import AdminClaimTicketButton from "./AdminClaimTicketButton";
import AdminTicketList from "./AdminTicketList";
import AdjustCreditForm from "./AdjustCreditForm";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin"));

  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (roleRow?.role !== "admin") redirect("/no-access?reason=admin_required");

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, subject, description, status, member_id, assigned_va_id, created_at, rating, feedback, completed_at")
    .order("created_at", { ascending: false });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role");

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

  const { data: txRows } = await supabase
    .from("credit_transactions")
    .select("member_id, amount");

  const balanceByMember = (txRows ?? []).reduce(
    (acc, { member_id, amount }) => {
      acc[member_id] = (acc[member_id] ?? 0) + amount;
      return acc;
    },
    {} as Record<string, number>
  );
  const totalCreditsInCirculation = Object.values(balanceByMember).reduce(
    (s, b) => s + (b > 0 ? b : 0),
    0
  );

  const byStatus = (tickets ?? []).reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const unassignedTickets = (tickets ?? []).filter(
    (t) => t.status === "new" && t.assigned_va_id == null
  );

  const myClaimedTickets = (tickets ?? []).filter(
    (t) => t.assigned_va_id === user.id
  );

  return (
    <>
      <h1 className="page-title">CEO Dashboard</h1>
      {myClaimedTickets.length > 0 && (
        <section className="card card--highlight" style={{ marginBottom: "var(--space-2xl)" }}>
          <h2 className="section-heading">My claimed tickets</h2>
          <ul className="ticket-list">
            {myClaimedTickets.map((t) => (
              <li key={t.id} className="ticket-item">
                <div>
                  <Link href={`/admin/${t.id}`}>{t.subject}</Link>
                  <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)" }}>
                    {t.status} · {formatInCentral(t.created_at)}
                  </span>
                </div>
                <Link href={`/admin/${t.id}`} className="btn btn-secondary">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="card card--highlight" style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">System summary</h2>
        <ul className="summary-list">
          <li>Total tickets: {tickets?.length ?? 0}</li>
          <li>By status: {JSON.stringify(byStatus)}</li>
          <li>Total credits in circulation: {totalCreditsInCirculation}</li>
          <li>Profiles: {profiles?.length ?? 0}</li>
          <li>
            NPS score: {npsScore != null ? npsScore : "—"}
            {npsResponseCount > 0 && ` (${npsResponseCount} response${npsResponseCount !== 1 ? "s" : ""})`}
          </li>
        </ul>
      </section>
      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Adjust credit balance</h2>
        <div className="card">
          <AdjustCreditForm />
        </div>
      </section>
      {unassignedTickets.length > 0 && (
        <section style={{ marginBottom: "var(--space-2xl)" }}>
          <h2 className="section-heading">Unassigned tickets (claim as CEO)</h2>
          <ul className="ticket-list">
            {unassignedTickets.map((t) => (
              <li key={t.id} className="ticket-item">
                <div>
                  <Link href={`/admin/${t.id}`}>{t.subject}</Link>
                  <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)" }}>
                    {formatInCentral(t.created_at)}
                  </span>
                </div>
                <AdminClaimTicketButton ticketId={t.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h2 className="section-heading">All tickets</h2>
        <AdminTicketList tickets={tickets ?? []} />
      </section>
    </>
  );
}
