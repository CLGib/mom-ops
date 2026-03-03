import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";
import TicketThread from "../TicketThread";
import UpdateTicketStatus from "../UpdateTicketStatus";
import CancelTaskButton from "../CancelTaskButton";
import SetTicketCost from "../SetTicketCost";
import MessageBody from "../../components/MessageBody";
import ClaimTicketButton from "../ClaimTicketButton";
import RealtimeTicketMessages from "../RealtimeTicketMessages";
import VAAssistantPanel from "./VAAssistantPanel";

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
    .select("id, subject, status, description, assigned_va_id, requested_va_id, credit_cost, tip_amount, created_at, rating, feedback, completed_at")
    .eq("id", id)
    .single();

  if (!ticket) notFound();
  const isAssignedToMe = ticket.assigned_va_id === user.id;
  const isUnassigned = ticket.assigned_va_id == null && ticket.status === "new";
  if (!isAssignedToMe && !isUnassigned) notFound();

  const { data: vaProfile } = await supabase
    .from("va_profiles")
    .select("onboarding_complete")
    .eq("user_id", user.id)
    .single();
  const onboardingComplete = vaProfile?.onboarding_complete === true;

  if (isUnassigned) {
    const requestedYou = ticket.requested_va_id === user.id;
    // Fetch attachments for requested VA so they can see task details before claiming
    let unassignedAttachments: { id: string; file_path: string; file_name: string | null; media_type: string; message_id: string | null }[] = [];
    if (requestedYou) {
      const { createServiceClient } = await import("@/lib/supabase/service");
      const serviceSupabase = createServiceClient();
      const { data } = await serviceSupabase
        .from("ticket_attachments")
        .select("id, file_path, file_name, media_type, message_id")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true });
      unassignedAttachments = data ?? [];
    }
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/task-attachments`
      : "";
    const taskAttachments = unassignedAttachments.filter((a) => !a.message_id);
    return (
      <main className="app-shell">
        <Link href="/va" className="back-link">
          ← Back to dashboard
        </Link>
        {!onboardingComplete && (
          <div className="card" style={{ marginBottom: "var(--space-md)", borderColor: "var(--accent)" }}>
            <p style={{ margin: 0, marginBottom: "var(--space-sm)" }}>
              <strong>Complete onboarding before you can claim this task.</strong>
            </p>
            <Link href="/va/onboarding" className="btn btn-primary">
              Go to Onboarding
            </Link>
          </div>
        )}
        <h1 className="page-title">{ticket.subject}</h1>
        <p className="ticket-meta" style={{ marginBottom: "var(--space-md)" }}>
          Created {formatInCentral(ticket.created_at)} · Unassigned
          {requestedYou && (
            <>
              {" · "}
              <span
                style={{
                  fontWeight: 600,
                  color: "var(--accent, #b8860b)",
                }}
              >
                Member requested you
              </span>
            </>
          )}
        </p>
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          {requestedYou
            ? "Review the task below. Member context will be visible after you claim."
            : "Review the task below. Member context and attachments will be visible after you claim."}
        </p>
        {ticket.description && (
          <div className="card" style={{ marginBottom: "var(--space-lg)", padding: "var(--space-md)" }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>Task details</h2>
            <div className="ticket-description">{ticket.description}</div>
          </div>
        )}
        {requestedYou && taskAttachments.length > 0 && baseUrl && (
          <section style={{ marginBottom: "var(--space-lg)" }}>
            <h2 className="section-heading">Task attachments</h2>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: "var(--space-md)" }}>
              {taskAttachments.map((a) => {
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
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flexWrap: "wrap" }}>
          <ClaimTicketButton ticketId={id} subject={ticket.subject} onboardingComplete={onboardingComplete} />
          <Link href="/va" className="btn btn-secondary">
            Back to list
          </Link>
        </div>
      </main>
    );
  }

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("id, sender_role, message, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  // Fetch attachments with service client so VA always sees member attachments (bypass RLS after we've verified assignment)
  const { createServiceClient } = await import("@/lib/supabase/service");
  const serviceSupabase = createServiceClient();
  const { data: attachments } = await serviceSupabase
    .from("ticket_attachments")
    .select("id, file_path, file_name, media_type, message_id")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const { data: memberContextRows } = await supabase.rpc("get_va_member_context", {
    p_ticket_id: id,
  });
  const memberContext = Array.isArray(memberContextRows) && memberContextRows.length > 0 ? memberContextRows[0] : null;

  let vaDisplayName: string = "Specialist";
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

  const mc = memberContext as {
    preferred_name?: string | null;
    full_name?: string | null;
    city?: string | null;
    state?: string | null;
    kids_count?: number | null;
    kids_ages?: number[] | null;
  } | null;
  const memberShortSummary: string[] = [];
  if (mc?.preferred_name || mc?.full_name) {
    memberShortSummary.push(mc.preferred_name?.trim() || mc.full_name?.trim() || "Member");
  }
  if (mc?.city || mc?.state) {
    memberShortSummary.push([mc?.city, mc?.state].filter(Boolean).join(", "));
  }
  if (mc?.kids_count != null || (Array.isArray(mc?.kids_ages) && (mc?.kids_ages?.length ?? 0) > 0)) {
    const parts: string[] = [];
    if (mc?.kids_count != null) parts.push(`${mc.kids_count} kid${mc.kids_count !== 1 ? "s" : ""}`);
    if (Array.isArray(mc?.kids_ages) && mc.kids_ages.length > 0) {
      parts.push(`ages ${mc.kids_ages.join(", ")}`);
    }
    memberShortSummary.push(parts.join(" · "));
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/task-attachments`
    : "";

  return (
    <main className="app-shell">
      <div className="va-task-detail">
        <div className="va-task-detail__main">
          <Link href="/va" className="back-link">
            ← Back to dashboard
          </Link>
          <h1 className="page-title">{ticket.subject}</h1>
          <p className="ticket-meta" style={{ marginBottom: "var(--space-sm)" }}>
            Created {formatInCentral(ticket.created_at)}
          </p>
          <p style={{ marginBottom: "var(--space-md)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)" }}>
            <span>Status: <UpdateTicketStatus ticketId={id} currentStatus={ticket.status} /></span>
            <CancelTaskButton ticketId={id} currentStatus={ticket.status} />
          </p>
          <SetTicketCost
            ticketId={id}
            currentCreditCost={ticket.credit_cost}
            currentTipAmount={ticket.tip_amount}
          />
          {(ticket.status === "completed" || ticket.status === "closed") && ticket.rating != null && (
            <section style={{ marginBottom: "var(--space-lg)" }} aria-label="Member review">
              <h2 className="section-heading">Member review</h2>
              <div className="card" style={{ padding: "var(--space-md)" }}>
                <p className="ticket-meta">
                  {ticket.rating} out of 5
                  {ticket.completed_at && ` · Completed ${formatInCentral(ticket.completed_at)}`}
                </p>
                {ticket.feedback && (
                  <blockquote style={{ marginTop: "var(--space-sm)", marginBottom: 0, paddingLeft: "var(--space-md)", borderLeft: "3px solid var(--border, #e5e5e5)" }}>
                    {ticket.feedback}
                  </blockquote>
                )}
              </div>
            </section>
          )}
          <section style={{ marginBottom: "var(--space-lg)" }}>
            <h2 className="section-heading">Member context</h2>
            {memberShortSummary.length > 0 ? (
              <p style={{ marginBottom: "var(--space-sm)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                {memberShortSummary.join(" · ")}
              </p>
            ) : (
              <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
                No profile summary yet.
              </p>
            )}
            <Link href={`/va/${id}/member-context`} className="link" style={{ fontSize: "0.9rem" }}>
              Open full profile, quizzes &amp; surveys →
            </Link>
          </section>
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
        </div>
        <div className="va-task-detail__side">
          {isAssignedToMe && <RealtimeTicketMessages ticketId={id} />}
          {isAssignedToMe && <VAAssistantPanel ticketId={id} />}
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
            <TicketThread ticketId={id} ticketSubject={ticket.subject} senderId={user.id} senderRole="va" />
          </section>
        </div>
      </div>
    </main>
  );
}
