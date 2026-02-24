import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TicketThread from "../TicketThread";

export default async function MemberTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/member"));

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, subject, status, description, created_at")
    .eq("id", id)
    .eq("member_id", user.id)
    .single();

  if (!ticket) notFound();

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("id, sender_role, message, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const { data: attachments } = await supabase
    .from("ticket_attachments")
    .select("id, file_path, file_name, media_type")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/task-attachments`
    : "";

  return (
    <main className="app-shell">
      <Link href="/member" className="back-link">
        ← Back to tasks
      </Link>
      <h1 className="page-title">{ticket.subject}</h1>
      <p className="ticket-meta" style={{ marginBottom: "var(--space-md)" }}>
        Status: {ticket.status} -  Created{" "}
        {new Date(ticket.created_at).toLocaleString()}
      </p>
      {ticket.description && (
        <div className="ticket-description">{ticket.description}</div>
      )}
      {(attachments ?? []).length > 0 && baseUrl && (
        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h2 className="section-heading">Attachments</h2>
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: "var(--space-md)" }}>
            {(attachments ?? []).map((a) => {
              const url = `${baseUrl}/${a.file_path}`;
              return (
                <li key={a.id}>
                  {a.media_type === "image" ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={a.file_name ?? "Attachment"}
                        style={{ maxWidth: 200, maxHeight: 200, objectFit: "cover", borderRadius: 4 }}
                      />
                    </a>
                  ) : (
                    <div>
                      <video
                        src={url}
                        controls
                        style={{ maxWidth: 320, maxHeight: 240 }}
                        preload="metadata"
                      />
                      {a.file_name && (
                        <p className="form-note" style={{ marginTop: "var(--space-xs)" }}>
                          <a href={url} target="_blank" rel="noopener noreferrer">{a.file_name}</a>
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <section style={{ marginBottom: "var(--space-lg)" }}>
        <h2 className="section-heading">Thread</h2>
        <ul className="thread-list">
          {(messages ?? []).map((m) => (
            <li key={m.id} className="thread-message">
              <p className="thread-message-meta">
                {m.sender_role ?? "-"} ·{" "}
                {new Date(m.created_at).toLocaleString()}
              </p>
              <p className="thread-message-body">{m.message}</p>
            </li>
          ))}
        </ul>
        <TicketThread ticketId={id} senderId={user.id} senderRole="member" />
      </section>
    </main>
  );
}
