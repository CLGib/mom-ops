import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";
import TicketThread from "../TicketThread";
import RequestVaDropdown from "../RequestVaDropdown";
import MessageBody from "../../components/MessageBody";
import VAProfileCard from "../../components/VAProfileCard";
import TicketReviewSurvey from "../TicketReviewSurvey";
import ScrollToRate from "../ScrollToRate";
import TipCard from "../TipCard";

export default async function MemberTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rate?: string; tip?: string }>;
}) {
  const { id } = await params;
  const { rate, tip } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/member"));

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, subject, status, description, created_at, requested_va_id, assigned_va_id, rating, feedback")
    .eq("id", id)
    .eq("member_id", user.id)
    .single();

  if (!ticket) notFound();

  const { data: pastTickets } = await supabase
    .from("tickets")
    .select("assigned_va_id")
    .eq("member_id", user.id)
    .not("assigned_va_id", "is", null)
    .in("status", ["completed", "closed"]);
  const pastVaIds = [...new Set((pastTickets ?? []).map((t) => t.assigned_va_id!).filter(Boolean))];
  let pastVas: { id: string; label: string; imageUrl?: string | null }[] = [];
  if (pastVaIds.length > 0) {
    const { data: vaPublicProfiles } = await supabase
      .from("va_profiles")
      .select("user_id, display_name, profile_image_url")
      .in("user_id", pastVaIds);
    const byId = new Map(vaPublicProfiles?.map((v) => [v.user_id, v]) ?? []);
    pastVas = pastVaIds.map((id) => {
      const v = byId.get(id);
      return {
        id,
        label: v?.display_name ?? "Previous specialist",
        imageUrl: v?.profile_image_url ?? null,
      };
    });
  }

  const showRequestVa = pastVas.length > 0 && ticket.assigned_va_id == null;

  let vaProfile: { display_name: string; profile_image_url: string | null; bio: string | null } | null = null;
  if (ticket.assigned_va_id) {
    const { data: vp } = await supabase
      .from("va_profiles")
      .select("display_name, profile_image_url, bio")
      .eq("user_id", ticket.assigned_va_id)
      .single();
    if (vp) vaProfile = vp;
  }

  let requestedVaName: string | null = null;
  if (ticket.requested_va_id) {
    const { data: rvp } = await supabase
      .from("va_profiles")
      .select("display_name")
      .eq("user_id", ticket.requested_va_id)
      .single();
    requestedVaName = rvp?.display_name ?? "Requested specialist";
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
      <Link href="/member" className="back-link">
        ← Back to tasks
      </Link>
      <h1 className="page-title">{ticket.subject}</h1>
      <p className="ticket-meta" style={{ marginBottom: "var(--space-md)" }}>
        Status: {ticket.status} -  Created{" "}
        {formatInCentral(ticket.created_at)}
      </p>
      {ticket.requested_va_id && requestedVaName && (
        <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
          Requested: {requestedVaName} (we&apos;ll do our best to match you)
        </p>
      )}
      {ticket.assigned_va_id && (
        <section style={{ marginBottom: "var(--space-md)" }} aria-label="Assigned VA">
          <VAProfileCard
            displayName={vaProfile?.display_name ?? "Your VA"}
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
            const senderName = m.sender_role === "va" ? (vaProfile?.display_name ?? "Your specialist") : m.sender_role === "member" ? "You" : (m.sender_role ?? "—");
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
        <TicketThread ticketId={id} senderId={user.id} senderRole="member" />
      </section>
    </main>
  );
}
