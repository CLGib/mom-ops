import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";
import AdminClaimTicketButton from "../AdminClaimTicketButton";
import AssignRequestedVaButton from "../AssignRequestedVaButton";
import UpdateTicketStatus from "../../va/UpdateTicketStatus";
import CancelTaskButton from "../../va/CancelTaskButton";
import SetTicketCost from "../../va/SetTicketCost";
import TicketThread from "../../member/TicketThread";
import MessageBody from "../../components/MessageBody";

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
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin"));

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (roleRow?.role !== "admin") {
    redirect("/no-access?reason=admin_required");
  }

  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "id, subject, status, description, member_id, assigned_va_id, requested_va_id, credit_cost, tip_amount, created_at, completed_at"
    )
    .eq("id", id)
    .single();

  if (!ticket) notFound();

  let requestedVaName: string | null = null;
  if (ticket.requested_va_id) {
    const { data: rvp } = await supabase
      .from("va_profiles")
      .select("display_name")
      .eq("user_id", ticket.requested_va_id)
      .single();
    requestedVaName = rvp?.display_name ?? null;
  }

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("id, sender_role, message, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const { data: attachments } = await supabase
    .from("ticket_attachments")
    .select("id, file_path, file_name, media_type, message_id")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const { data: memberContextRows } = await supabase.rpc("get_va_member_context", {
    p_ticket_id: id,
  });
  const memberContext = Array.isArray(memberContextRows) && memberContextRows.length > 0 ? memberContextRows[0] : null;

  let vaDisplayName: string = "VA";
  if (ticket.assigned_va_id) {
    const { data: vaProfileRow } = await supabase
      .from("va_profiles")
      .select("display_name")
      .eq("user_id", ticket.assigned_va_id)
      .single();
    if (vaProfileRow?.display_name) vaDisplayName = vaProfileRow.display_name;
  }
  const memberDisplayName =
    (memberContext as { preferred_name?: string | null; full_name?: string | null } | null)?.preferred_name ||
    (memberContext as { full_name?: string | null } | null)?.full_name ||
    "Member";

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/task-attachments`
    : "";

  const canClaim = ticket.status === "new" && ticket.assigned_va_id == null;
  const isAssignedToMe = ticket.assigned_va_id === user.id;

  return (
    <main className="app-shell">
      <Link href="/admin" className="back-link">
        ← Back to CEO
      </Link>
      <h1 className="page-title">{ticket.subject}</h1>
      {canClaim && (
        <div style={{ marginBottom: "var(--space-md)", display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", alignItems: "center" }}>
          <AdminClaimTicketButton ticketId={id} />
          {ticket.requested_va_id && (
            <AssignRequestedVaButton ticketId={id} requestedVaId={ticket.requested_va_id} />
          )}
        </div>
      )}
      {ticket.requested_va_id && requestedVaName && (
        <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
          Requested specialist: {requestedVaName}
        </p>
      )}
      <p className="ticket-meta" style={{ marginBottom: "var(--space-xs)" }}>
        Member: {ticket.member_id?.slice(0, 8)}… · Assigned:{" "}
        {ticket.assigned_va_id ? (isAssignedToMe ? "You (CEO)" : ticket.assigned_va_id.slice(0, 8) + "…") : "-"}
      </p>
      <p style={{ marginBottom: "var(--space-md)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)" }}>
        <span>Status: <UpdateTicketStatus ticketId={id} currentStatus={ticket.status} /></span>
        <CancelTaskButton ticketId={id} currentStatus={ticket.status} />
      </p>
      <p className="ticket-meta" style={{ marginBottom: "var(--space-md)" }}>
        Created {formatInCentral(ticket.created_at)}
        {ticket.completed_at &&
          ` · Completed ${formatInCentral(ticket.completed_at)}`}
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
              <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Name</dt><dd>{(memberContext as { preferred_name?: string | null; full_name?: string | null }).preferred_name || (memberContext as { full_name?: string | null }).full_name || "-"}</dd></div>
              {(memberContext as { timezone?: string | null }).timezone && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Timezone</dt><dd>{(memberContext as { timezone: string }).timezone}</dd></div>}
              {((memberContext as { city?: string | null }).city || (memberContext as { state?: string | null }).state) && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Location</dt><dd>{[(memberContext as { city?: string | null }).city, (memberContext as { state?: string | null }).state].filter(Boolean).join(", ") || "-"}</dd></div>}
              {(((memberContext as { kids_count?: number | null }).kids_count != null) || (Array.isArray((memberContext as { kids_ages?: unknown }).kids_ages) && (memberContext as { kids_ages: unknown[] }).kids_ages.length > 0)) && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Kids</dt><dd>{String((memberContext as { kids_count?: number | null }).kids_count != null ? `Count: ${(memberContext as { kids_count: number }).kids_count}` : "")}{String(Array.isArray((memberContext as { kids_ages?: unknown }).kids_ages) ? ` · Ages: ${(memberContext as { kids_ages: unknown[] }).kids_ages.join(", ")}` : "")}</dd></div>}
              {Array.isArray((memberContext as { schools?: unknown }).schools) && (memberContext as { schools: { name?: string }[] }).schools.length > 0 && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Schools</dt><dd>{String((memberContext as { schools: { name?: string }[] }).schools.map((s) => s.name || "-").join("; "))}</dd></div>}
              {Array.isArray((memberContext as { activities?: unknown }).activities) && (memberContext as { activities: { name?: string }[] }).activities.length > 0 && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Activities</dt><dd>{String((memberContext as { activities: { name?: string }[] }).activities.map((a) => a.name || "-").join("; "))}</dd></div>}
              {(memberContext as { constraints?: string | null }).constraints && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Constraints</dt><dd>{(memberContext as { constraints: string }).constraints}</dd></div>}
              {(memberContext as { communication_tone?: string | null }).communication_tone && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Tone</dt><dd style={{ textTransform: "capitalize" }}>{(memberContext as { communication_tone: string }).communication_tone}</dd></div>}
              {Array.isArray((memberContext as { important_dates?: unknown }).important_dates) && (memberContext as { important_dates: { label?: string; date?: string }[] }).important_dates.length > 0 && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Important dates</dt><dd>{String((memberContext as { important_dates: { label?: string; date?: string }[] }).important_dates.map((d) => `${d.label || "-"}: ${d.date || ""}`).join("; "))}</dd></div>}
              {((memberContext as { task_submission_preference?: string | null }).task_submission_preference || (memberContext as { typical_turnaround?: string | null }).typical_turnaround) && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Preferences</dt><dd>{`Task submission: ${(memberContext as { task_submission_preference?: string | null }).task_submission_preference || "-"} · Turnaround: ${(memberContext as { typical_turnaround?: string | null }).typical_turnaround || "-"}`}</dd></div>}
            </dl>
          </div>
        </section>
      )}
      {!memberContext && isAssignedToMe && (
        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h2 className="section-heading">Member context</h2>
          <p className="form-note">No member context available.</p>
        </section>
      )}
      {ticket.description && (
        <div className="ticket-description" style={{ marginBottom: "var(--space-lg)" }}>{ticket.description}</div>
      )}
      {(attachments ?? []).filter((a) => !a.message_id).length > 0 && baseUrl && (
        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h2 className="section-heading">Task attachments</h2>
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: "var(--space-md)" }}>
            {(attachments ?? []).filter((a) => !a.message_id).map((a) => {
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
          {(messages ?? []).map((m) => {
            const msgAttachments = (attachments ?? []).filter((a) => a.message_id === m.id);
            const senderName = m.sender_role === "va" ? vaDisplayName : m.sender_role === "member" ? memberDisplayName : (m.sender_role ?? "-");
            return (
              <li key={m.id} className="thread-message">
                <p className="thread-message-meta">
                  {senderName} ·{" "}
                  {formatInCentral(m.created_at)}
                </p>
                <MessageBody message={m.message} />
                {msgAttachments.length > 0 && baseUrl && (
                  <ul style={{ listStyle: "none", padding: 0, marginTop: "var(--space-sm)", display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
                    {msgAttachments.map((a) => {
                      const url = `${baseUrl}/${a.file_path}`;
                      return (
                        <li key={a.id}>
                          {a.media_type === "image" ? (
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt={a.file_name ?? "Attachment"} style={{ maxWidth: 160, maxHeight: 160, objectFit: "cover", borderRadius: 4 }} />
                            </a>
                          ) : a.media_type === "audio" ? (
                            <div>
                              <audio src={url} controls style={{ maxWidth: 280 }} />
                              {a.file_name && <p className="form-note" style={{ marginTop: "var(--space-2xs)" }}><a href={url} target="_blank" rel="noopener noreferrer">{a.file_name}</a></p>}
                            </div>
                          ) : (
                            <div>
                              <video src={url} controls style={{ maxWidth: 240, maxHeight: 160 }} preload="metadata" />
                              {a.file_name && <p className="form-note" style={{ marginTop: "var(--space-2xs)" }}><a href={url} target="_blank" rel="noopener noreferrer">{a.file_name}</a></p>}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        <TicketThread ticketId={id} senderId={user.id} senderRole="admin" />
      </section>
    </main>
  );
}
