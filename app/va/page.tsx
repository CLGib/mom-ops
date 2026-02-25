import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ClaimTicketButton from "./ClaimTicketButton";
import UpdateTicketStatus from "./UpdateTicketStatus";

export default async function VAPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va"));

  const { data: unassigned } = await supabase
    .from("tickets")
    .select("id, subject, member_id, created_at")
    .eq("status", "new")
    .is("assigned_va_id", null)
    .order("created_at", { ascending: false });

  const { data: assigned } = await supabase
    .from("tickets")
    .select("id, subject, status, credit_cost, tip_amount, created_at")
    .eq("assigned_va_id", user.id)
    .order("updated_at", { ascending: false });

  const { data: completed } = await supabase
    .from("tickets")
    .select("credit_cost, tip_amount")
    .eq("assigned_va_id", user.id)
    .eq("status", "completed");

  const payoutSummary =
    completed?.reduce(
      (sum, t) =>
        sum + (t.credit_cost ?? 0) * 0.2 + (t.tip_amount ?? 0) / 100,
      0
    ) ?? 0;

  return (
    <main className="app-shell">
      <h1 className="page-title">VA Dashboard</h1>
      <section className="card card--highlight" style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Your payout (completed tasks)</h2>
        <p style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text)", margin: "0 0 var(--space-xs)" }}>
          ${payoutSummary.toFixed(2)}
        </p>
        <p className="ticket-meta">20% of credit_cost + tips</p>
      </section>
      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Unassigned tasks (new)</h2>
        <ul className="ticket-list">
          {(unassigned ?? []).map((t) => (
            <li key={t.id} className="ticket-item">
              <div>
                <Link href={`/va/${t.id}`}>{t.subject}</Link>
                <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)" }}>
                  {new Date(t.created_at).toLocaleString()}
                </span>
              </div>
              <ClaimTicketButton ticketId={t.id} />
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="section-heading">Your assigned tasks</h2>
        <ul className="ticket-list">
          {(assigned ?? []).map((t) => (
            <li key={t.id} className="ticket-item">
              <div>
                <Link href={`/va/${t.id}`}>{t.subject}</Link>
                <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)" }}>
                  {t.status} -  {new Date(t.created_at).toLocaleString()}
                </span>
              </div>
              <UpdateTicketStatus ticketId={t.id} currentStatus={t.status} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
