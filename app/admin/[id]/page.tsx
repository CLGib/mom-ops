import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "id, subject, status, description, member_id, assigned_va_id, credit_cost, tip_amount, created_at, completed_at"
    )
    .eq("id", id)
    .single();

  if (!ticket) notFound();

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("id, sender_role, message, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  return (
    <main className="app-shell">
      <Link href="/admin" className="back-link">
        ← Back to admin
      </Link>
      <h1 className="page-title">{ticket.subject}</h1>
      <p className="ticket-meta" style={{ marginBottom: "var(--space-xs)" }}>
        Status: {ticket.status} — Member: {ticket.member_id} — VA:{" "}
        {ticket.assigned_va_id ?? "—"}
      </p>
      <p className="ticket-meta" style={{ marginBottom: "var(--space-md)" }}>
        Created {new Date(ticket.created_at).toLocaleString()}
        {ticket.completed_at &&
          ` · Completed ${new Date(ticket.completed_at).toLocaleString()}`}
      </p>
      {ticket.credit_cost != null && (
        <p className="section-body" style={{ marginBottom: "var(--space-xs)" }}>
          Credit cost: {ticket.credit_cost}
        </p>
      )}
      {ticket.tip_amount != null && ticket.tip_amount > 0 && (
        <p className="section-body" style={{ marginBottom: "var(--space-md)" }}>
          Tip: ${(ticket.tip_amount / 100).toFixed(2)}
        </p>
      )}
      {ticket.description && (
        <div className="ticket-description">{ticket.description}</div>
      )}
      <section>
        <h2 className="section-heading">Thread</h2>
        <ul className="thread-list">
          {(messages ?? []).map((m) => (
            <li key={m.id} className="thread-message">
              <p className="thread-message-meta">
                {m.sender_role ?? "—"} ·{" "}
                {new Date(m.created_at).toLocaleString()}
              </p>
              <p className="thread-message-body">{m.message}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
