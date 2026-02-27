"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatInCentral, formatRelative } from "@/lib/format-date";
import UpdateTicketStatus from "./UpdateTicketStatus";

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

export default function VAAssignedTaskList({ tickets, inboxMode, showClosedOnly }: Props) {
  const [search, setSearch] = useState("");
  const [includeClosed, setIncludeClosed] = useState(false);

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
    return tickets.filter((t) => t.status !== "closed");
  }, [tickets, search, includeClosed, inboxMode, showClosedOnly]);

  const openCount = tickets.filter((t) => t.status !== "closed").length;
  const closedCount = tickets.filter((t) => t.status === "closed").length;
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
                : `Showing ${openCount} open task${openCount !== 1 ? "s" : ""}. ${closedCount > 0 ? `${closedCount} closed — search or enable "Include closed" to see them.` : ""}`}
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
              </div>
              {!showClosedOnly && <UpdateTicketStatus ticketId={t.id} currentStatus={t.status} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
