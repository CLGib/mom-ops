"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatInCentral, formatRelative } from "@/lib/format-date";
import UpdateTicketStatus from "./UpdateTicketStatus";
import CancelTaskModal from "./CancelTaskModal";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  credit_cost: number | null;
  tip_amount: number | null;
  created_at: string;
  updated_at?: string;
};

type Props = {
  tickets: Ticket[];
  /** Inbox view: open tasks only, no "Include closed", show last activity and Reply link */
  inboxMode?: boolean;
  /** Closed section: only closed tasks, no "Include closed", show last activity and View thread link */
  showClosedOnly?: boolean;
};

const CANCELLABLE_STATUSES = ["assigned", "in_progress"];

export default function VAAssignedTaskList({ tickets, inboxMode, showClosedOnly }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [includeClosed, setIncludeClosed] = useState(false);
  const [cancelModalTicketId, setCancelModalTicketId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      return tickets.filter((t) => {
        const matchSubject = t.subject?.toLowerCase().includes(q);
        const matchStatus = t.status?.toLowerCase().includes(q);
        return matchSubject || matchStatus;
      });
    }
    if (showClosedOnly) return tickets;
    if (inboxMode) return tickets;
    if (includeClosed) return tickets;
    return tickets.filter(
      (t) =>
        t.status !== "closed" &&
        t.status !== "cancelled_by_va" &&
        t.status !== "cancelled_by_admin"
    );
  }, [tickets, search, includeClosed, inboxMode, showClosedOnly]);

  const terminalStatuses = ["closed", "cancelled_by_va", "cancelled_by_admin"];
  const openCount = tickets.filter((t) => !terminalStatuses.includes(t.status)).length;
  const closedCount = tickets.filter((t) => terminalStatuses.includes(t.status)).length;
  const showIncludeClosed = !inboxMode && !showClosedOnly;

  if (tickets.length === 0) {
    return (
      <p className="form-note">
        {inboxMode ? "Inbox clear. Claim more tasks below when you're ready." : "No assigned tasks. Claim one from the list above."}
      </p>
    );
  }

  return (
    <>
      {showIncludeClosed && (
        <div className="form-group" style={{ marginBottom: "var(--space-sm)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-md)" }}>
          <input
            id="va-assigned-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your assigned tasks"
            aria-label="Search assigned tasks"
            className="input"
            style={{ width: "100%", maxWidth: "20rem" }}
            aria-describedby="va-assigned-search-hint"
          />
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", fontSize: "0.9rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={includeClosed}
              onChange={(e) => setIncludeClosed(e.target.checked)}
              aria-label="Include closed tasks"
            />
            Include closed
          </label>
          <p id="va-assigned-search-hint" className="form-note" style={{ margin: 0, width: "100%" }}>
            {search.trim()
              ? `Showing ${filtered.length} matching task${filtered.length !== 1 ? "s" : ""}`
              : includeClosed
                ? `Showing all ${tickets.length} tasks.`
                : `Showing ${openCount} open task${openCount !== 1 ? "s" : ""}. ${closedCount > 0 ? `${closedCount} closed. Search or enable "Include closed" to see them.` : ""}`}
          </p>
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="form-note">
          {search.trim()
            ? "No tasks match your search."
            : "No open assigned tasks. Enable \"Include closed\" or search to find closed tasks."}
        </p>
      ) : (
        <ul className="ticket-list">
          {filtered.map((t) => (
            <li key={t.id} className="ticket-item">
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)" }}>
                <Link href={`/va/${t.id}`}>{t.subject}</Link>
                <span className="ticket-meta">
                  {t.status}
                  {t.updated_at && (
                    <> · Last activity {formatRelative(t.updated_at)}</>
                  )}
                  {!t.updated_at && <> · {formatInCentral(t.created_at)}</>}
                </span>
                <Link href={`/va/${t.id}`} className="btn btn-secondary" style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }}>
                  {showClosedOnly ? "View thread" : "Reply"}
                </Link>
                {!showClosedOnly && CANCELLABLE_STATUSES.includes(t.status) && (
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem", color: "var(--color-error, #b91c1c)" }}
                    onClick={() => setCancelModalTicketId(t.id)}
                  >
                    Cancel Task
                  </button>
                )}
              </div>
              {!showClosedOnly && <UpdateTicketStatus ticketId={t.id} currentStatus={t.status} />}
            </li>
          ))}
        </ul>
      )}
      {cancelModalTicketId && (
        <CancelTaskModal
          ticketId={cancelModalTicketId}
          onSuccess={() => router.refresh()}
          onClose={() => setCancelModalTicketId(null)}
        />
      )}
    </>
  );
}
