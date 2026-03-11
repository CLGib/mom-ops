import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";
import { getTaskLibrary, findCreditsBySubject } from "@/lib/task-library";
import { deriveKidsDisplay } from "@/lib/age-from-birthday";
import AdminClaimTicketButton from "../AdminClaimTicketButton";
import AssignRequestedVaButton from "../AssignRequestedVaButton";
import UpdateTicketStatus from "../../va/UpdateTicketStatus";
import ReassignTaskButton from "../../va/ReassignTaskButton";
import CancelTaskButton from "../../va/CancelTaskButton";
import SetTicketCost from "../../va/SetTicketCost";
import TicketThread from "../../member/TicketThread";
import MessageBody from "../../components/MessageBody";
import ApproveMessageButton from "../ApproveMessageButton";
import { getMemberDisplayNameForMacro } from "@/lib/member-display-name";

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
      "id, ticket_number, subject, status, description, member_id, assigned_va_id, requested_va_id, credit_cost, tip_amount, created_at, completed_at"
    )
    .eq("id", id)
    .single();

  if (!ticket) notFound();

  const taskLibrary = await getTaskLibrary();
  const suggestedCredit = findCreditsBySubject(taskLibrary, ticket.subject);

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
    .select("id, sender_role, message, created_at, visible_to_member, internal")
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
  let assignedVaWorkRequiresReview = false;
  if (ticket.assigned_va_id) {
    const { data: vaProfileRow } = await supabase
      .from("va_profiles")
      .select("display_name, work_requires_review")
      .eq("user_id", ticket.assigned_va_id)
      .single();
    if (vaProfileRow?.display_name) vaDisplayName = vaProfileRow.display_name;
    assignedVaWorkRequiresReview = vaProfileRow?.work_requires_review === true;
  }
  const memberDisplayName = getMemberDisplayNameForMacro(
    (memberContext as { preferred_name?: string | null } | null)?.preferred_name,
    (memberContext as { full_name?: string | null } | null)?.full_name
  );

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
      <h1 className="page-title">#{ticket.ticket_number} {ticket.subject}</h1>
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
        Ticket #{ticket.ticket_number} · Member: {memberDisplayName} · Assigned:{" "}
        {ticket.assigned_va_id ? (isAssignedToMe ? "You (CEO)" : vaDisplayName) : "-"}
      </p>
      <p style={{ marginBottom: "var(--space-md)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)" }}>
        <span>Status: <UpdateTicketStatus ticketId={id} currentStatus={ticket.status} vaOnly={false} /></span>
        <ReassignTaskButton ticketId={id} currentStatus={ticket.status} redirectToVaOnSuccess={false} />
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
        suggestedCredit={suggestedCredit}
      />
      {memberContext && (
        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h2 className="section-heading">Member context</h2>
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <dl style={{ margin: 0, display: "grid", gap: "var(--space-xs)", fontSize: "0.9rem" }}>
              <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Name</dt><dd>{(memberContext as { preferred_name?: string | null; full_name?: string | null }).preferred_name || (memberContext as { full_name?: string | null }).full_name || "-"}</dd></div>
              {(memberContext as { timezone?: string | null }).timezone && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Timezone</dt><dd>{(memberContext as { timezone: string }).timezone}</dd></div>}
              {((memberContext as { city?: string | null }).city || (memberContext as { state?: string | null }).state) && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Location</dt><dd>{[(memberContext as { city?: string | null }).city, (memberContext as { state?: string | null }).state].filter(Boolean).join(", ") || "-"}</dd></div>}
              {(() => {
                const kidsDisplay = deriveKidsDisplay(memberContext);
                return kidsDisplay ? <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Kids</dt><dd>{kidsDisplay}</dd></div> : null;
              })()}
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
                  ) : a.media_type === "document" ? (
                    <div>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="link">
                        {a.file_name ?? "Download attachment"}
                      </a>
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
      {assignedVaWorkRequiresReview && (messages ?? []).some((m) => (m as { visible_to_member?: boolean; internal?: boolean }).visible_to_member === false && (m as { internal?: boolean }).internal !== true) && (
        <section className="card" style={{ marginBottom: "var(--space-lg)", padding: "var(--space-md)", borderColor: "var(--accent, #b8860b)" }}>
          <h2 className="section-heading">Pending review</h2>
          <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
            This VA is in training mode. Approve messages to send them to the member.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(messages ?? [])
              .filter((m) => (m as { visible_to_member?: boolean; internal?: boolean }).visible_to_member === false && (m as { internal?: boolean }).internal !== true)
              .map((m) => (
                <li
                  key={m.id}
                  style={{
                    padding: "var(--space-sm) 0",
                    borderBottom: "1px solid var(--color-border, #e5e5e5)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-xs)",
                  }}
                >
                  <p className="thread-message-meta" style={{ margin: 0 }}>
                    {vaDisplayName} · {formatInCentral(m.created_at)}
                  </p>
                  <div style={{ background: "var(--color-bg-subtle, #f5f5f5)", padding: "var(--space-sm)", borderRadius: 6 }}>
                    <MessageBody message={m.message} />
                  </div>
                  <ApproveMessageButton messageId={m.id} ticketId={id} />
                </li>
              ))}
          </ul>
        </section>
      )}
      <section style={{ marginBottom: "var(--space-lg)" }}>
        <h2 className="section-heading">Thread</h2>
        <ul className="thread-list">
          {(messages ?? []).map((m) => {
            const msgAttachments = (attachments ?? []).filter((a) => a.message_id === m.id);
            const senderName = m.sender_role === "va" ? vaDisplayName : m.sender_role === "member" ? memberDisplayName : (m.sender_role ?? "-");
            const isInternal = (m as { internal?: boolean }).internal === true;
            const isPendingReview = (m as { visible_to_member?: boolean }).visible_to_member === false && !isInternal;
            return (
              <li
                key={m.id}
                className="thread-message"
                style={
                  isInternal
                    ? { background: "var(--color-bg-subtle, #f5f5f5)", borderRadius: 8, padding: "var(--space-sm)", borderLeft: "3px solid var(--text-soft, #888)" }
                    : undefined
                }
              >
                <p className="thread-message-meta">
                  {senderName} ·{" "}
                  {formatInCentral(m.created_at)}
                  {isInternal && (
                    <span style={{ marginLeft: "var(--space-xs)", fontSize: "0.75rem", color: "var(--text-soft)", fontWeight: 600 }}>Internal</span>
                  )}
                  {isPendingReview && (
                    <span style={{ marginLeft: "var(--space-xs)", fontSize: "0.75rem", color: "var(--accent, #b8860b)", fontWeight: 600 }}>Pending review</span>
                  )}
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
                          ) : a.media_type === "document" ? (
                            <a href={url} target="_blank" rel="noopener noreferrer" className="link">{a.file_name ?? "Download"}</a>
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
        <TicketThread ticketId={id} senderId={user.id} senderRole="admin" canSendInternalNote />
      </section>
    </main>
  );
}
