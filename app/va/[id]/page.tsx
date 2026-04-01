import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";
import { getStatusLabel, STATUS_GROUP_CANCELLED } from "@/lib/ticket-status";
import { getTaskLibrary, findCreditsBySubject } from "@/lib/task-library";
import { getSimilarTicketsBySubject } from "@/lib/suggested-tasks";
import TicketThread from "../TicketThread";
import UpdateTicketStatus from "../UpdateTicketStatus";
import CancelTaskButton from "../CancelTaskButton";
import ReassignTaskButton from "../ReassignTaskButton";
import SetTicketCost from "../SetTicketCost";
import MessageBody from "../../components/MessageBody";
import ClaimTicketButton from "../ClaimTicketButton";
import RealtimeTicketMessages from "../../components/RealtimeTicketMessages";
import TaskAttachment from "../../components/TaskAttachment";
import VAAssistantPanel from "./VAAssistantPanel";
import VATaskViewShell from "../VATaskViewShell";
import CreateAnotherTaskCollapsible from "../CreateAnotherTaskCollapsible";
import VAInboxNav from "../VAInboxNav";
import VAUpliftChecklist from "../VAUpliftChecklist";
import FormattedTaskDescription from "../../components/FormattedTaskDescription";
import { getMemberDisplayNameForMacro } from "@/lib/member-display-name";

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
    .select("id, ticket_number, subject, status, description, member_id, assigned_va_id, requested_va_id, credit_cost, tip_amount, created_at, rating, feedback, completed_at, is_free_trial_task, is_member_first_task")
    .eq("id", id)
    .single();

  if (!ticket) notFound();
  const isAssignedToMe = ticket.assigned_va_id === user.id;
  const isUnassigned =
    ticket.assigned_va_id == null && (ticket.status === "new" || ticket.status === "reopened");
  const isReadOnly = !isAssignedToMe && !isUnassigned;

  const taskLibrary = await getTaskLibrary();
  const suggestedCredit = findCreditsBySubject(taskLibrary, ticket.subject);

  const { data: vaProfile } = await supabase
    .from("va_profiles")
    .select("onboarding_complete, training_complete, work_requires_review")
    .eq("user_id", user.id)
    .single();
  const onboardingComplete = vaProfile?.onboarding_complete === true;
  const trainingComplete = vaProfile?.training_complete === true;
  if (!trainingComplete) redirect("/va/training");
  const canClaimTasks = onboardingComplete && trainingComplete;
  const workRequiresReview = vaProfile?.work_requires_review ?? true;

  const { data: otherTickets } = await supabase
    .from("tickets")
    .select("id, ticket_number, subject, status")
    .neq("id", id)
    .order("updated_at", { ascending: false })
    .limit(300);
  const cancelledSet = new Set(STATUS_GROUP_CANCELLED);
  const nonCancelledTickets = (otherTickets ?? []).filter(
    (t) => t.status && !cancelledSet.has(t.status)
  );
  const similarTickets = getSimilarTicketsBySubject(
    id,
    ticket.subject ?? "",
    nonCancelledTickets,
    { limit: 3 }
  );

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
        <h1 className="page-title">#{ticket.ticket_number} {ticket.subject}</h1>
        <p className="ticket-meta" style={{ marginBottom: "var(--space-md)" }}>
          Created {formatInCentral(ticket.created_at)} · Unassigned
          {ticket.status === "reopened" && (
            <>
              {" · "}
              <span
                style={{
                  fontWeight: 600,
                  color: "var(--accent, #b8860b)",
                }}
              >
                Reopened
              </span>
            </>
          )}
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
          {ticket.is_free_trial_task && (
            <>
              {" · "}
              <span
                style={{
                  fontWeight: 600,
                  color: "var(--color-error, #b91c1c)",
                }}
              >
                Free trial
              </span>
            </>
          )}
          {ticket.is_member_first_task && (
            <>
              {" · "}
              <span
                style={{
                  fontWeight: 600,
                  color: "var(--color-info, #1d4ed8)",
                }}
              >
                1st time user
              </span>
            </>
          )}
        </p>
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          {ticket.status === "reopened"
            ? "Member replied after this task was closed. Claim to handle the follow-up."
            : requestedYou
              ? "Review the task below. Member context will be visible after you claim."
              : "Review the task below. Member context and attachments will be visible after you claim."}
        </p>
        {ticket.description && (
          <div className="card" style={{ marginBottom: "var(--space-lg)", padding: "var(--space-md)" }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>Task details</h2>
            <FormattedTaskDescription description={ticket.description} className="ticket-description" />
          </div>
        )}
        {requestedYou && taskAttachments.length > 0 && baseUrl && (
          <section style={{ marginBottom: "var(--space-lg)" }}>
            <h2 className="section-heading">Task attachments</h2>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: "var(--space-md)" }}>
              {taskAttachments.map((a) => (
                <TaskAttachment key={a.id} attachment={a} baseUrl={baseUrl} canRemove={false} />
              ))}
            </ul>
          </section>
        )}
        {similarTickets.length > 0 && (
          <section style={{ marginBottom: "var(--space-md)" }} aria-label="Similar tickets to answer quickly">
            <h2 className="section-heading" style={{ marginBottom: "var(--space-xs)", fontSize: "0.9375rem" }}>Similar tickets</h2>
            <p className="form-note" style={{ marginBottom: "var(--space-xs)", fontSize: "0.8125rem" }}>
              Other tasks like this — open to see how they were handled or to pick one up.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, maxWidth: 720 }}>
              {similarTickets.map((t) => (
                <li
                  key={t.id}
                  style={{
                    padding: "var(--space-xs) var(--space-sm)",
                    marginBottom: "2px",
                    border: "1px solid var(--color-border, #e5e5e5)",
                    borderRadius: "var(--radius, 6px)",
                    backgroundColor: "var(--color-bg, #fff)",
                    fontSize: "0.875rem",
                  }}
                >
                  <Link
                    href={`/va/${t.id}`}
                    style={{ display: "block", textDecoration: "none", color: "inherit" }}
                  >
                    <span className="ticket-status-badge" style={{ marginRight: "var(--space-xs)", fontSize: "0.65rem" }}>
                      {getStatusLabel(t.status)}
                    </span>
                    #{t.ticket_number} {t.subject}
                  </Link>
                </li>
              ))}
            </ul>
            <p style={{ margin: 0, marginTop: "var(--space-xs)" }}>
              <Link href="/va/tickets" target="_blank" rel="noopener noreferrer" className="form-note" style={{ fontSize: "0.9rem" }}>
                … show more
              </Link>
            </p>
          </section>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flexWrap: "wrap" }}>
          <ClaimTicketButton ticketId={id} subject={ticket.subject} onboardingComplete={canClaimTasks} />
          <Link href="/va" className="btn btn-secondary">
            Back to list
          </Link>
        </div>
      </main>
    );
  }

  // Inbox list for play-mode nav (prev/next); same order as tasks page Inbox
  const { data: myAssigned } = await supabase
    .from("tickets")
    .select("id, status")
    .eq("assigned_va_id", user.id)
    .order("updated_at", { ascending: false });
  const terminalStatuses = ["completed", "closed", "cancelled_by_va", "cancelled_by_admin"];
  const inboxIds = (myAssigned ?? []).filter((t) => !terminalStatuses.includes(t.status)).map((t) => t.id);
  const currentIndex = inboxIds.indexOf(id);
  const nextTicketId = currentIndex >= 0 && currentIndex < inboxIds.length - 1 ? inboxIds[currentIndex + 1] ?? null : null;
  const prevTicketId = currentIndex > 0 ? inboxIds[currentIndex - 1] : null;

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("id, sender_role, message, created_at, internal, visible_to_member")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

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

  const { data: otherMemberTickets } =
    ticket.member_id != null
      ? await supabase
          .from("tickets")
          .select("id, subject, status, updated_at")
          .eq("member_id", ticket.member_id)
          .neq("id", id)
          .order("updated_at", { ascending: false })
      : { data: null };

  let vaDisplayName: string = "Specialist";
  if (ticket.assigned_va_id) {
    const { data: vaProfileRow } = await supabase
      .from("va_profiles")
      .select("display_name")
      .eq("user_id", ticket.assigned_va_id)
      .single();
    if (vaProfileRow?.display_name) vaDisplayName = vaProfileRow.display_name;
  }
  const memberDisplayName = getMemberDisplayNameForMacro(
    (memberContext as { preferred_name?: string | null } | null)?.preferred_name,
    (memberContext as { full_name?: string | null } | null)?.full_name
  );

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

  const { data: upliftChecklist } =
    isAssignedToMe
      ? await supabase
          .from("ticket_va_uplift_checklist")
          .select("u, p, l, i, f, t, completed_at")
          .eq("ticket_id", id)
          .maybeSingle()
      : { data: null };

  const upliftInitialState = upliftChecklist
    ? {
        u: upliftChecklist.u ?? false,
        p: upliftChecklist.p ?? false,
        l: upliftChecklist.l ?? false,
        i: upliftChecklist.i ?? false,
        f: upliftChecklist.f ?? false,
        t: upliftChecklist.t ?? false,
        completedAt: upliftChecklist.completed_at ?? null,
      }
    : null;

  const mainContent = (
    <div style={{ padding: "0 var(--space-md)" }}>
      <div style={{ marginBottom: "var(--space-lg)" }}>
        {isAssignedToMe && <VAAssistantPanel ticketId={id} ticketSubject={ticket.subject} />}
      </div>
      <div>
        <Link href="/va" className="back-link">
          ← Back to dashboard
        </Link>
        {isAssignedToMe && (
          <VAInboxNav prevTicketId={prevTicketId} nextTicketId={nextTicketId} />
        )}
        {isReadOnly && (
          <div
            className="card"
            style={{
              marginBottom: "var(--space-md)",
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-subtle, #fafafa)",
            }}
            role="status"
          >
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-soft, #666)" }}>
              <strong>Read-only.</strong> This task is not assigned to you. You can view it for context.
            </p>
          </div>
        )}
        <h1 className="page-title">#{ticket.ticket_number} {ticket.subject}</h1>
        <p className="ticket-meta" style={{ marginBottom: "var(--space-sm)" }}>
          Created {formatInCentral(ticket.created_at)}
          {isReadOnly && ticket.assigned_va_id && (
            <> · Assigned to another specialist</>
          )}
          {isReadOnly && (
            <> · Status: {getStatusLabel(ticket.status)}</>
          )}
          {isAssignedToMe && (
            <> · Status: {getStatusLabel(ticket.status)}</>
          )}
          {ticket.is_free_trial_task && (
            <>
              {" · "}
              <span
                style={{
                  fontWeight: 600,
                  color: "var(--color-error, #b91c1c)",
                }}
              >
                Free trial
              </span>
            </>
          )}
          {ticket.is_member_first_task && (
            <>
              {" · "}
              <span
                style={{
                  fontWeight: 600,
                  color: "var(--color-info, #1d4ed8)",
                }}
              >
                1st time user
              </span>
            </>
          )}
        </p>
        {isAssignedToMe && (
          <SetTicketCost
            ticketId={id}
            currentCreditCost={ticket.credit_cost}
            currentTipAmount={ticket.tip_amount}
            suggestedCredit={suggestedCredit}
          />
        )}
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
        {ticket.description && (
          <div style={{ marginBottom: "var(--space-lg)" }}>
            <FormattedTaskDescription description={ticket.description} className="ticket-description" />
          </div>
        )}
        {(attachments ?? []).filter((a) => !a.message_id).length > 0 && baseUrl && (
          <section style={{ marginBottom: "var(--space-lg)" }}>
            <h2 className="section-heading">Task attachments</h2>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: "var(--space-md)" }}>
              {(attachments ?? []).filter((a) => !a.message_id).map((a) => (
                <TaskAttachment key={a.id} attachment={a} baseUrl={baseUrl} canRemove={isAssignedToMe} />
              ))}
            </ul>
          </section>
        )}
        {similarTickets.length > 0 && (
          <section style={{ marginBottom: "var(--space-md)" }} aria-label="Similar tickets to answer quickly">
            <h2 className="section-heading" style={{ marginBottom: "var(--space-xs)", fontSize: "0.9375rem" }}>Similar tickets</h2>
            <p className="form-note" style={{ marginBottom: "var(--space-xs)", fontSize: "0.8125rem" }}>
              Other tasks like this — open to see how they were handled or to pick one up.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, maxWidth: 720 }}>
              {similarTickets.map((t) => (
                <li
                  key={t.id}
                  style={{
                    padding: "var(--space-xs) var(--space-sm)",
                    marginBottom: "2px",
                    border: "1px solid var(--color-border, #e5e5e5)",
                    borderRadius: "var(--radius, 6px)",
                    backgroundColor: "var(--color-bg, #fff)",
                    fontSize: "0.875rem",
                  }}
                >
                  <Link
                    href={`/va/${t.id}`}
                    style={{ display: "block", textDecoration: "none", color: "inherit" }}
                  >
                    <span className="ticket-status-badge" style={{ marginRight: "var(--space-xs)", fontSize: "0.65rem" }}>
                      {getStatusLabel(t.status)}
                    </span>
                    #{t.ticket_number} {t.subject}
                  </Link>
                </li>
              ))}
            </ul>
            <p style={{ margin: 0, marginTop: "var(--space-xs)" }}>
              <Link href="/va/tickets" target="_blank" rel="noopener noreferrer" className="form-note" style={{ fontSize: "0.9rem" }}>
                … show more
              </Link>
            </p>
          </section>
        )}
        {(isAssignedToMe || isReadOnly) && <RealtimeTicketMessages ticketId={id} />}
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
                      {msgAttachments.map((a) => (
                        <TaskAttachment key={a.id} attachment={a} baseUrl={baseUrl} canRemove={isAssignedToMe} compact />
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          {isAssignedToMe && (
            <>
              <VAUpliftChecklist ticketId={id} initialState={upliftInitialState} />
              <div style={{ marginBottom: "var(--space-md)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Status:</span>
                <UpdateTicketStatus ticketId={id} currentStatus={ticket.status} vaOnly creditCost={ticket.credit_cost} />
                <ReassignTaskButton ticketId={id} currentStatus={ticket.status} />
                <CancelTaskButton ticketId={id} currentStatus={ticket.status} />
              </div>
              <TicketThread ticketId={id} ticketSubject={ticket.subject} senderId={user.id} senderRole="va" workRequiresReview={workRequiresReview} canSendInternalNote memberDisplayName={memberDisplayName} vaDisplayName={vaDisplayName} />
            </>
          )}
          {isReadOnly && (
            <TicketThread ticketId={id} ticketSubject={ticket.subject} senderId={user.id} senderRole="va" canSendInternalNote internalNotesOnly memberDisplayName={memberDisplayName} vaDisplayName={vaDisplayName} />
          )}
        </section>
        {isAssignedToMe && ticket.member_id && (
          <CreateAnotherTaskCollapsible
            memberId={ticket.member_id}
            memberLabel={memberDisplayName}
            taskLibrary={taskLibrary.map((t) => ({ task: t.task, credits: t.credits }))}
          />
        )}
      </div>
    </div>
  );

  const memberContent = (
    <>
      <h2 className="section-heading">Member overview</h2>
      {memberShortSummary.length > 0 ? (
        <p style={{ marginBottom: "var(--space-sm)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
          {memberShortSummary.join(" · ")}
        </p>
      ) : (
        <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
          No profile summary yet.
        </p>
      )}
      {isAssignedToMe && (
        <p style={{ marginBottom: "var(--space-md)" }}>
          <Link href={`/va/${id}/member-context`} className="link" style={{ fontSize: "0.9rem" }} target="_blank" rel="noopener noreferrer">
            Open full profile, quizzes &amp; surveys →
          </Link>
        </p>
      )}
      {(otherMemberTickets?.length ?? 0) > 0 && (
        <section style={{ marginTop: "var(--space-md)" }}>
          <h3 className="section-heading" style={{ fontSize: "0.9375rem", marginBottom: "var(--space-xs)" }}>Other tasks from this member</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.9rem" }}>
            {otherMemberTickets!.map((t) => (
              <li key={t.id} style={{ marginBottom: "var(--space-xs)" }}>
                <Link href={`/va/${t.id}`} className="link">
                  {t.subject}
                </Link>
                <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)", display: "block" }}>
                  {getStatusLabel(t.status)} · {formatInCentral(t.updated_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );

  return (
    <main className="app-shell">
      <VATaskViewShell mainContent={mainContent} memberContent={memberContent} />
    </main>
  );
}
