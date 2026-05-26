import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTaskByFromTaskParam } from "@/lib/task-library";

export const dynamic = "force-dynamic";

// Calm confirmation screen shown immediately after a member clicks "Bring
// this helper in" on the library. The ticket has already been created; the
// page just gives reassurance.
export default async function HelperSentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ticketId } = await params;
  if (!ticketId) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      "/login?next=" + encodeURIComponent(`/member/helpers/${ticketId}/sent`),
    );
  }

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, member_id, subject, helper_id")
    .eq("id", ticketId)
    .maybeSingle();

  // Ownership check — don't let one member see another's confirmation.
  if (!ticket || ticket.member_id !== user.id) notFound();

  const helper = ticket.helper_id
    ? await getTaskByFromTaskParam(ticket.helper_id)
    : null;
  const helperName = helper?.task ?? ticket.subject?.replace(/^Helper:\s*/i, "") ?? "your helper";
  const displayName = /helper$/i.test(helperName.trim())
    ? helperName
    : `${helperName} Helper`;

  return (
    <main className="app-shell" style={{ paddingTop: "var(--space-2xl)", paddingBottom: "var(--space-2xl)" }}>
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "var(--space-2xl) var(--space-xl)",
          textAlign: "center",
        }}
      >
        {/* Soft confirmation glyph */}
        <div
          aria-hidden
          style={{
            width: 72,
            height: 72,
            margin: "0 auto var(--space-lg)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--accent-soft-bg, #f8f5ed)",
            color: "var(--accent, #b8860b)",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1
          className="page-title"
          style={{ marginBottom: "var(--space-sm)", fontSize: "1.75rem" }}
        >
          Your {displayName} is on the way.
        </h1>

        <p
          className="section-lead"
          style={{ marginBottom: "var(--space-md)", color: "var(--text-muted)" }}
        >
          Check your email in the next 24 hours.
        </p>

        <p
          className="form-note"
          style={{
            marginBottom: "var(--space-2xl)",
            maxWidth: 440,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          If we need anything else from you, we&apos;ll reach out. Otherwise,
          your deliverable will be in your inbox soon.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "var(--space-sm)",
          }}
        >
          <Link href="/member/helpers" className="btn btn-primary">
            Browse more helpers
          </Link>
          <Link
            href="/member"
            className="btn btn-secondary"
            style={{ borderColor: "var(--color-border)" }}
          >
            Back to Home
          </Link>
        </div>

        <p
          className="form-note"
          style={{
            marginTop: "var(--space-xl)",
            fontSize: "0.8125rem",
            color: "var(--text-muted)",
          }}
        >
          Reference:{" "}
          <Link href={`/member/${ticket.id}`} className="link">
            view this request
          </Link>
        </p>
      </div>
    </main>
  );
}
