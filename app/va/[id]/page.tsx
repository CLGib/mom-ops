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
  if (!user) redirect("/login?next=" + encodeURIComponent("/va"));

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

  const { data: attachments } = await supabase
    .from("ticket_attachments")
    .select("id, file_path, file_name, media_type")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const { data: memberContextRows } = await supabase.rpc("get_va_member_context", {
    p_ticket_id: id,
  });
  const memberContext = Array.isArray(memberContextRows) && memberContextRows.length > 0 ? memberContextRows[0] : null;

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/task-attachments`
    : "";

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
      {memberContext && (
        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h2 className="section-heading">Member context</h2>
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <dl style={{ margin: 0, display: "grid", gap: "var(--space-xs)", fontSize: "0.9rem" }}>
              <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Name</dt><dd>{(memberContext as { preferred_name?: string | null; full_name?: string | null }).preferred_name || (memberContext as { full_name?: string | null }).full_name || "—"}</dd></div>
              {(memberContext as { timezone?: string | null }).timezone && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Timezone</dt><dd>{(memberContext as { timezone: string }).timezone}</dd></div>}
              {((memberContext as { city?: string | null }).city || (memberContext as { state?: string | null }).state) && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Location</dt><dd>{[(memberContext as { city?: string | null }).city, (memberContext as { state?: string | null }).state].filter(Boolean).join(", ") || "—"}</dd></div>}
              {(((memberContext as { kids_count?: number | null }).kids_count != null) || (Array.isArray((memberContext as { kids_ages?: unknown }).kids_ages) && (memberContext as { kids_ages: unknown[] }).kids_ages.length > 0)) && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Kids</dt><dd>{String((memberContext as { kids_count?: number | null }).kids_count != null ? `Count: ${(memberContext as { kids_count: number }).kids_count}` : "")}{String(Array.isArray((memberContext as { kids_ages?: unknown }).kids_ages) ? ` · Ages: ${(memberContext as { kids_ages: unknown[] }).kids_ages.join(", ")}` : "")}</dd></div>}
              {Array.isArray((memberContext as { schools?: unknown }).schools) && (memberContext as { schools: { name?: string }[] }).schools.length > 0 && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Schools</dt><dd>{String((memberContext as { schools: { name?: string }[] }).schools.map((s) => s.name || "—").join("; "))}</dd></div>}
              {Array.isArray((memberContext as { activities?: unknown }).activities) && (memberContext as { activities: { name?: string }[] }).activities.length > 0 && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Activities</dt><dd>{String((memberContext as { activities: { name?: string }[] }).activities.map((a) => a.name || "—").join("; "))}</dd></div>}
              {(memberContext as { constraints?: string | null }).constraints && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Constraints</dt><dd>{(memberContext as { constraints: string }).constraints}</dd></div>}
              {(memberContext as { communication_tone?: string | null }).communication_tone && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Tone</dt><dd style={{ textTransform: "capitalize" }}>{(memberContext as { communication_tone: string }).communication_tone}</dd></div>}
              {Array.isArray((memberContext as { important_dates?: unknown }).important_dates) && (memberContext as { important_dates: { label?: string; date?: string }[] }).important_dates.length > 0 && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Important dates</dt><dd>{String((memberContext as { important_dates: { label?: string; date?: string }[] }).important_dates.map((d) => `${d.label || "—"}: ${d.date || ""}`).join("; "))}</dd></div>}
              {((memberContext as { task_submission_preference?: string | null }).task_submission_preference || (memberContext as { typical_turnaround?: string | null }).typical_turnaround) && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Preferences</dt><dd>{`Task submission: ${(memberContext as { task_submission_preference?: string | null }).task_submission_preference || "—"} · Turnaround: ${(memberContext as { typical_turnaround?: string | null }).typical_turnaround || "—"}`}</dd></div>}
            </dl>
          </div>
        </section>
      )}
      {!memberContext && (
        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h2 className="section-heading">Member context</h2>
          <p className="form-note">No member context available.</p>
        </section>
      )}
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
                  ) : a.media_type === "audio" ? (
                    <div>
                      <p className="form-note" style={{ marginBottom: "var(--space-xs)" }}>Voice note</p>
                      <audio src={url} controls style={{ maxWidth: 320 }} />
                      {a.file_name && (
                        <p className="form-note" style={{ marginTop: "var(--space-xs)" }}>
                          <a href={url} target="_blank" rel="noopener noreferrer">{a.file_name}</a>
                        </p>
                      )}
                    </div>
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
        <TicketThread ticketId={id} ticketSubject={ticket.subject} senderId={user.id} senderRole="va" />
      </section>
    </main>
  );
}
