import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";
import { getStatusLabel } from "@/lib/ticket-status";
import TicketThread from "../TicketThread";
import RequestVaDropdown from "../RequestVaDropdown";
import MessageBody from "../../components/MessageBody";
import VAProfileCard from "../../components/VAProfileCard";
import TicketReviewSurvey from "../TicketReviewSurvey";
import ApproveTaskButton from "../ApproveTaskButton";
import ScrollToRate from "../ScrollToRate";
import TipCard from "../TipCard";
import RealtimeTicketMessages from "../../components/RealtimeTicketMessages";
import TaskAttachment from "../../components/TaskAttachment";

export default async function MemberTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rate?: string; tip?: string }>;
}) {
  try {
    const { id } = await params;
    const { rate, tip } = await searchParams;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=" + encodeURIComponent("/member"));

    const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, subject, status, description, created_at, requested_va_id, assigned_va_id, rating, feedback")
    .eq("id", id)
    .eq("member_id", user.id)
    .single();

  if (ticketError || !ticket) notFound();

  const { data: pastTicketsWithSubject } = await supabase
    .from("tickets")
    .select("assigned_va_id, subject")
    .eq("member_id", user.id)
    .not("assigned_va_id", "is", null)
    .in("status", ["completed", "closed"])
    .order("completed_at", { ascending: false });
  const pastVaIds = [...new Set((pastTicketsWithSubject ?? []).map((t) => t.assigned_va_id!).filter(Boolean))];
  const subjectByVaId = new Map<string, string>();
  for (const t of pastTicketsWithSubject ?? []) {
    if (t.assigned_va_id && !subjectByVaId.has(t.assigned_va_id)) {
      subjectByVaId.set(t.assigned_va_id, (t.subject && String(t.subject).trim()) || "previous task");
    }
  }
  const pastVas: { id: string; label: string; imageUrl?: string | null }[] = pastVaIds.map((vaId) => ({
    id: vaId,
    label: `Same specialist as "${subjectByVaId.get(vaId) ?? "previous task"}"`,
    imageUrl: null,
  }));

  const showRequestVa = pastVas.length > 0 && ticket.assigned_va_id == null;

  let vaProfile: { display_name: string; profile_image_url: string | null; bio: string | null } | null = null;
  let requestedVaName: string | null = null;
  const vaIdsToFetch = [ticket.assigned_va_id, ticket.requested_va_id].filter(Boolean) as string[];
  if (vaIdsToFetch.length > 0) {
    const { data: vaProfiles } = await supabase
      .from("va_profiles")
      .select("user_id, display_name, profile_image_url, bio")
      .in("user_id", vaIdsToFetch);
    const byId = new Map((vaProfiles ?? []).map((v) => [v.user_id, v]));
    if (ticket.assigned_va_id) {
      const vp = byId.get(ticket.assigned_va_id);
      if (vp) vaProfile = { display_name: vp.display_name ?? "", profile_image_url: vp.profile_image_url ?? null, bio: vp.bio ?? null };
    }
    if (ticket.requested_va_id) {
      const rvp = byId.get(ticket.requested_va_id);
      requestedVaName = rvp?.display_name?.trim() ?? null;
    }
  }

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("id, sender_role, message, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const { data: attachmentsRaw } = await supabase
    .from("ticket_attachments")
    .select("id, file_path, file_name, media_type, message_id")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const visibleMessageIds = new Set((messages ?? []).map((m) => m.id));
  const attachments = (attachmentsRaw ?? []).filter(
    (a) => !a.message_id || visibleMessageIds.has(a.message_id)
  );

  const { data: existingTip } = await supabase
    .from("task_tips")
    .select("id")
    .eq("task_id", id)
    .maybeSingle();
  const hasTip = !!existingTip;

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/task-attachments`
    : "";

  return (
    <main className="app-shell">
      <RealtimeTicketMessages ticketId={id} />
      <Link href="/member" className="back-link">
        ← Back to tasks
      </Link>
      <h1 className="page-title">{ticket.subject ?? "Task"}</h1>
      <p className="ticket-meta" style={{ marginBottom: "var(--space-md)", display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap" }}>
        <span className={`ticket-status-badge ticket-status-badge--${ticket.status}`}>
          {getStatusLabel(ticket.status)}
        </span>
        <span>Created {formatInCentral(ticket.created_at)}</span>
      </p>
      {ticket.status === "awaiting_member_approval" && (
        <ApproveTaskButton ticketId={id} />
      )}
      {ticket.requested_va_id && (
        <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
          Requested: {requestedVaName ?? "specialist"} (we&apos;ll do our best to match you)
        </p>
      )}
      {ticket.assigned_va_id && (
        <section style={{ marginBottom: "var(--space-md)" }} aria-label="Assigned specialist">
          <VAProfileCard
            displayName={vaProfile?.display_name?.trim() ?? "Your specialist"}
            bio={vaProfile?.bio ?? null}
            profileImageUrl={vaProfile?.profile_image_url ?? null}
          />
        </section>
      )}
      {showRequestVa && (
        <RequestVaDropdown
          ticketId={id}
          currentRequestedVaId={ticket.requested_va_id}
          pastVas={pastVas}
        />
      )}
      {ticket.description && (
        <div className="ticket-description">{ticket.description}</div>
      )}
      <section style={{ marginBottom: "var(--space-lg)" }}>
        <h2 className="section-heading">Task attachments</h2>
        {(attachments ?? []).filter((a) => !a.message_id && a.file_path).length > 0 && baseUrl ? (
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: "var(--space-md)" }}>
            {(attachments ?? []).filter((a) => !a.message_id && a.file_path).map((a) => (
              <TaskAttachment key={a.id} attachment={a} baseUrl={baseUrl} canRemove />
            ))}
          </ul>
        ) : (
          <p className="form-note" style={{ margin: 0 }}>No files attached to this task.</p>
        )}
      </section>
      {(ticket.status === "completed" || ticket.status === "closed") && (
        <>
          {ticket.rating == null ? (
            <TicketReviewSurvey ticketId={id} />
          ) : (
            <section
              id="rate"
              className="card"
              style={{ marginBottom: "var(--space-lg)" }}
              aria-label="Your review"
            >
              <h2 className="section-heading">Your review</h2>
              <p className="ticket-meta">
                You rated this task {ticket.rating} out of 5.
              </p>
              {ticket.feedback && (
                <blockquote style={{ marginTop: "var(--space-sm)", paddingLeft: "var(--space-md)", borderLeft: "3px solid var(--border, #e5e5e5)" }}>
                  {ticket.feedback}
                </blockquote>
              )}
              <p className="form-note" style={{ marginTop: "var(--space-sm)" }}>
                Thanks for your feedback.
              </p>
            </section>
          )}
          {(ticket.status === "completed" || ticket.status === "closed") && ticket.rating != null && (
            <>
              {tip === "success" || hasTip ? (
                <section
                  className="card"
                  style={{ marginBottom: "var(--space-lg)" }}
                  aria-label="Tip sent"
                >
                  <p style={{ margin: 0, fontSize: "1.125rem" }}>
                    ✨ Coffee sent! You just made someone&apos;s day.
                  </p>
                </section>
              ) : (
                <TipCard taskId={id} />
              )}
            </>
          )}
          {rate !== undefined && <ScrollToRate />}
        </>
      )}
      <section style={{ marginBottom: "var(--space-lg)" }}>
        <h2 className="section-heading">Thread</h2>
        {(messages ?? []).length === 0 && (
          <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
            No messages yet. Add a message below to start the conversation.
          </p>
        )}
        <ul className="thread-list">
            {(messages ?? []).map((m) => {
            const msgAttachments = (attachments ?? []).filter((a) => a.message_id === m.id && a.file_path);
            const senderName = m.sender_role === "va" ? (vaProfile?.display_name?.trim() ?? "Your specialist") : m.sender_role === "member" ? "You" : (m.sender_role ?? "-");
            return (
              <li key={m.id} className="thread-message">
                <p className="thread-message-meta">
                  {senderName} ·{" "}
                  {formatInCentral(m.created_at)}
                </p>
                <MessageBody message={m.message} />
                {msgAttachments.length > 0 && baseUrl && (
                  <ul style={{ listStyle: "none", padding: 0, marginTop: "var(--space-sm)", display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
                    {msgAttachments.map((a) => (
                      <TaskAttachment key={a.id} attachment={a} baseUrl={baseUrl} canRemove={m.sender_role === "member"} compact />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        <div className="thread-compose card" style={{ padding: "var(--space-md)" }}>
          <h3 className="section-heading" style={{ fontSize: "1rem", marginBottom: "var(--space-sm)" }}>Add a message</h3>
          <TicketThread ticketId={id} senderId={user.id} senderRole="member" />
        </div>
      </section>
    </main>
  );
  } catch (err) {
    const e = err as Error & { digest?: string };
    if (e?.digest?.startsWith?.("NEXT_REDIRECT") || e?.digest?.startsWith?.("NEXT_NOT_FOUND")) throw err;
    console.error("[member ticket page]", e?.message ?? e, e);
    return (
      <main className="app-shell">
        <Link href="/member" className="back-link">
          ← Back to tasks
        </Link>
        <h1 className="page-title">We couldn&apos;t load this task</h1>
        <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
          Something went wrong loading this task. Please try again or go back to your tasks.
        </p>
        <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap" }}>
          <Link href="/member" className="btn btn-primary">
            Back to tasks
          </Link>
        </div>
      </main>
    );
  }
}
