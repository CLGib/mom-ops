import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TicketThread from "../TicketThread";
import UpdateTicketStatus from "../UpdateTicketStatus";
import SetTicketCost from "../SetTicketCost";

export default async function VATicketPage({
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
    .select("id, subject, status, description, assigned_va_id, credit_cost, tip_amount, created_at")
    .eq("id", id)
    .single();

  if (!ticket) notFound();
  if (ticket.assigned_va_id !== user.id) notFound();

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("id, sender_role, message, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  return (
    <main className="app-shell">
      <Link href="/va" className="back-link">
        ← Back to dashboard
      </Link>
      <h1 className="page-title">{ticket.subject}</h1>
      <p className="ticket-meta" style={{ marginBottom: "var(--space-sm)" }}>
        Created {new Date(ticket.created_at).toLocaleString()}
      </p>
      <p style={{ marginBottom: "var(--space-md)" }}>
        Status: <UpdateTicketStatus ticketId={id} currentStatus={ticket.status} />
      </p>
      <SetTicketCost
        ticketId={id}
        currentCreditCost={ticket.credit_cost}
        currentTipAmount={ticket.tip_amount}
      />
      {ticket.description && (
        <div className="ticket-description">{ticket.description}</div>
      )}
      <section style={{ marginBottom: "var(--space-lg)" }}>
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
        <TicketThread ticketId={id} senderId={user.id} senderRole="va" />
      </section>
    </main>
  );
}
