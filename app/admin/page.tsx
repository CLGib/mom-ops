import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdjustCreditForm from "./AdjustCreditForm";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, subject, status, member_id, assigned_va_id, created_at")
    .order("created_at", { ascending: false });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role");

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

  return (
    <main className="app-shell app-shell--wide">
      <h1 className="page-title">Admin Dashboard</h1>
      <section className="card card--highlight" style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">System summary</h2>
        <ul className="summary-list">
          <li>Total tickets: {tickets?.length ?? 0}</li>
          <li>By status: {JSON.stringify(byStatus)}</li>
          <li>Total credits in circulation: {totalCreditsInCirculation}</li>
          <li>Profiles: {profiles?.length ?? 0}</li>
        </ul>
      </section>
      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Adjust credit balance</h2>
        <div className="card">
          <AdjustCreditForm />
        </div>
      </section>
      <section>
        <h2 className="section-heading">All tickets</h2>
        <ul className="ticket-list">
          {(tickets ?? []).map((t) => (
            <li key={t.id} className="ticket-item">
              <div>
                <Link href={`/admin/${t.id}`}>{t.subject}</Link>
                <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)" }}>
                  {t.status} — member: {t.member_id?.slice(0, 8)}… —{" "}
                  {new Date(t.created_at).toLocaleString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
