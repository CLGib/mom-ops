"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatInCentral, formatRelative } from "@/lib/format-date";
import { getStatusLabel } from "@/lib/ticket-status";
import UpdateTicketStatus from "./UpdateTicketStatus";
import CancelTaskModal from "./CancelTaskModal";

const PAGE_SIZE = 20;

type Ticket = {
  id: string;
  ticket_number?: number | null;
  subject: string;
  status: string;
  credit_cost: number | null;
  tip_amount: number | null;
  created_at: string;
  updated_at?: string;
  /** True when ticket is in inbox only because VA was @mentioned in an internal note */
  mentionedOnly?: boolean;
};

type Props = {
  tickets: Ticket[];
  /** Inbox view: open tasks only, no "Include closed", show last activity and Reply link */
  inboxMode?: boolean;
  /** Closed section: only closed tasks, no "Include closed", show last activity and View thread link */
  showClosedOnly?: boolean;
};

const CANCELLABLE_STATUSES = ["assigned", "in_progress"];

const CANCELLED_STATUSES = ["cancelled_by_va", "cancelled_by_admin"] as const;
const isCancelled = (status: string) => CANCELLED_STATUSES.includes(status as (typeof CANCELLED_STATUSES)[number]);

export default function VAAssignedTaskList({ tickets, inboxMode, showClosedOnly }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [includeClosed, setIncludeClosed] = useState(false);
  const [page, setPage] = useState(0);
  const [cancelModalTicketId, setCancelModalTicketId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const excludeCancelled = (list: Ticket[]) => list.filter((t) => !isCancelled(t.status));
    if (q) {
      // When searching: include cancelled so they are findable
      const qNum = parseInt(q, 10);
      const matchTicketNum = !Number.isNaN(qNum) && String(qNum) === q;
      return tickets.filter((t) => {
        const matchSubject = t.subject?.toLowerCase().includes(q);
        const matchStatus = t.status?.toLowerCase().includes(q);
        const matchNumber = matchTicketNum && t.ticket_number != null && t.ticket_number === qNum;
        return matchSubject || matchStatus || matchNumber;
      });
    }
    if (showClosedOnly) return tickets;
    if (inboxMode) return tickets;
    if (includeClosed) return excludeCancelled(tickets);
    return tickets.filter(
      (t) =>
        t.status !== "closed" &&
        t.status !== "cancelled_by_va" &&
        t.status !== "cancelled_by_admin"
    );
  }, [tickets, search, includeClosed, inboxMode, showClosedOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = useMemo(
    () => filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [filtered, currentPage]
  );

  const terminalStatuses = ["closed", "cancelled_by_va", "cancelled_by_admin"];
  const openCount = tickets.filter((t) => !terminalStatuses.includes(t.status)).length;
  const closedCount = tickets.filter((t) => t.status === "closed" || t.status === "completed").length;
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search your assigned tasks. Canceled tasks are searchable."
            aria-label="Search assigned tasks"
            className="input"
            style={{ width: "100%", maxWidth: "20rem" }}
            aria-describedby="va-assigned-search-hint"
          />
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", fontSize: "0.9rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={includeClosed}
              onChange={(e) => {
                setIncludeClosed(e.target.checked);
                setPage(0);
              }}
              aria-label="Include closed tasks"
            />
            Include closed
          </label>
          <p id="va-assigned-search-hint" className="form-note" style={{ margin: 0, width: "100%" }}>
            {search.trim()
              ? `Showing ${filtered.length} matching task${filtered.length !== 1 ? "s" : ""}`
              : includeClosed
                ? `Showing all ${tickets.length} tasks.`
                : `Showing ${openCount} open task${openCount !== 1 ? "s" : ""}. ${closedCount > 0 ? `${closedCount} closed. Search or enable "Include closed" to see them.` : ""} Canceled tasks are hidden but searchable.`}
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
        <>
        <ul className="ticket-list">
          {paginated.map((t) => (
            <li key={t.id} className="ticket-item">
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)" }}>
                <Link href={`/va/${t.id}`}>#{t.ticket_number ?? t.id.slice(0, 8)} {t.subject}</Link>
                {t.mentionedOnly && (
                  <span className="ticket-status-badge" style={{ fontSize: "0.75rem", background: "var(--accent-soft-bg, rgba(184,134,11,0.15))", color: "var(--accent, #b8860b)" }}>
                    @Mentioned
                  </span>
                )}
                <span className="ticket-meta">
                  {getStatusLabel(t.status)}
                  {t.updated_at && (
                    <> · Last activity {formatRelative(t.updated_at)}</>
                  )}
                  {!t.updated_at && <> · {formatInCentral(t.created_at)}</>}
                  {t.tip_amount != null && t.tip_amount > 0 && (
                    <> · Tip: ${(t.tip_amount / 100).toFixed(2)}</>
                  )}
                </span>
                <Link href={`/va/${t.id}`} className="btn btn-secondary" style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }}>
                  {showClosedOnly ? "View thread" : "Reply"}
                </Link>
                {!showClosedOnly && !t.mentionedOnly && CANCELLABLE_STATUSES.includes(t.status) && (
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
              {!showClosedOnly && !t.mentionedOnly && <UpdateTicketStatus ticketId={t.id} currentStatus={t.status} vaOnly creditCost={t.credit_cost} />}
            </li>
          ))}
        </ul>
        {(showIncludeClosed || inboxMode || showClosedOnly) && totalPages > 1 && (
          <div style={{ display: "flex", gap: "var(--space-md)", marginTop: "var(--space-md)", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </button>
            <span className="form-note">
              Page {currentPage + 1} of {totalPages} ({filtered.length} total)
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next
            </button>
          </div>
        )}
        </>
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
