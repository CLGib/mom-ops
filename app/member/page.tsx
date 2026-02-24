import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CreateTicketForm from "./CreateTicketForm";

export default async function MemberPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: balance } = await supabase.rpc("get_member_balance", {
    p_member_id: user.id,
  });

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, subject, status, created_at")
    .eq("member_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="app-shell">
      <h1 className="page-title">Member Dashboard</h1>
      <p className="section-lead" style={{ marginBottom: "var(--space-lg)" }}>
        Credit Balance: <strong>{balance ?? 0}</strong>
      </p>
      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Create Ticket</h2>
        <div className="card">
          <CreateTicketForm memberId={user.id} />
        </div>
      </section>
      <section>
        <h2 className="section-heading">Your Tickets</h2>
        <ul className="ticket-list">
          {(tickets ?? []).map((t) => (
            <li key={t.id} className="ticket-item">
              <div>
                <Link href={`/member/${t.id}`}>{t.subject}</Link>
                <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)" }}>
                  {t.status} — {new Date(t.created_at).toLocaleString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
