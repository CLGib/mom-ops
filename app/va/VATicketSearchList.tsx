"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatInCentral } from "@/lib/format-date";
import { getStatusLabel } from "@/lib/ticket-status";

const PAGE_SIZE = 20;

type Ticket = {
  id: string;
  ticket_number: number;
  subject: string;
  description: string | null;
  status: string;
  assigned_va_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
};

type Props = {
  tickets: Ticket[];
  vaDisplayNames: Record<string, string>;
};

const CANCELLED_STATUSES = ["cancelled_by_va", "cancelled_by_admin"] as const;
const isCancelled = (status: string) =>
  CANCELLED_STATUSES.includes(status as (typeof CANCELLED_STATUSES)[number]);

const CLOSED_STATUSES = ["completed", "closed"] as const;
const isClosed = (status: string) =>
  CLOSED_STATUSES.includes(status as (typeof CLOSED_STATUSES)[number]);

const RECENTLY_CLOSED_DAYS = 7;

function isRecentlyClosed(t: Ticket): boolean {
  if (!isClosed(t.status) || isCancelled(t.status)) return false;
  const closedAt = t.completed_at ?? t.updated_at;
  if (!closedAt) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RECENTLY_CLOSED_DAYS);
  return new Date(closedAt) >= cutoff;
}

export default function VATicketSearchList({ tickets, vaDisplayNames }: Props) {
  const [search, setSearch] = useState("");
  const [includeClosed, setIncludeClosed] = useState(true);
  const [recentlyClosedOnly, setRecentlyClosedOnly] = useState(false);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const excludeCancelled = (list: Ticket[]) => list.filter((t) => !isCancelled(t.status));
    let base = tickets;
    if (recentlyClosedOnly) {
      base = tickets.filter(isRecentlyClosed);
    } else if (!includeClosed) {
      base = tickets.filter(
        (t) =>
          t.status !== "completed" &&
          t.status !== "closed" &&
          !isCancelled(t.status)
      );
    } else {
      base = excludeCancelled(tickets);
    }
    if (q) {
      const qNum = parseInt(q, 10);
      const matchTicketNum = !Number.isNaN(qNum) && String(qNum) === q;
      return base.filter((t) => {
        const matchSubject = t.subject?.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchVa = t.assigned_va_id
          ? (vaDisplayNames[t.assigned_va_id] ?? "").toLowerCase().includes(q)
          : false;
        const matchNumber = matchTicketNum && t.ticket_number === qNum;
        return matchSubject || matchDesc || matchVa || matchNumber;
      });
    }
    return base;
  }, [tickets, vaDisplayNames, search, includeClosed, recentlyClosedOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = useMemo(
    () => filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [filtered, currentPage]
  );

  const openCount = tickets.filter(
    (t) =>
      t.status !== "completed" &&
      t.status !== "closed" &&
      !isCancelled(t.status)
  ).length;
  const closedCount = tickets.filter(
    (t) =>
      (t.status === "completed" || t.status === "closed") && !isCancelled(t.status)
  ).length;

  return (
    <>
      <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
        Search all tickets (including closed) to see how other specialists handled similar tasks. Opening a ticket not assigned to you is read-only.
      </p>
      <div
        className="form-group"
        style={{
          marginBottom: "var(--space-sm)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "var(--space-md)",
        }}
      >
        <input
          id="va-ticket-search"
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search by #, subject, description, or specialist name"
          aria-label="Search tickets"
          className="input"
          style={{ width: "100%", maxWidth: "20rem" }}
          aria-describedby="va-ticket-search-hint"
        />
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-xs)",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={includeClosed}
            onChange={(e) => {
              setIncludeClosed(e.target.checked);
              if (e.target.checked) setRecentlyClosedOnly(false);
              setPage(0);
            }}
            disabled={recentlyClosedOnly}
            aria-label="Include closed tickets"
          />
          Include closed
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-xs)",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={recentlyClosedOnly}
            onChange={(e) => {
              setRecentlyClosedOnly(e.target.checked);
              setPage(0);
            }}
            aria-label="Show only recently closed tickets (last 7 days)"
          />
          Recently closed (7 days)
        </label>
        <p
          id="va-ticket-search-hint"
          className="form-note"
          style={{ margin: 0, width: "100%" }}
        >
          {search.trim()
            ? `Showing ${filtered.length} matching ticket${filtered.length !== 1 ? "s" : ""}`
            : recentlyClosedOnly
              ? `Showing ${filtered.length} ticket${filtered.length !== 1 ? "s" : ""} closed in the last 7 days.`
              : includeClosed
                ? `Showing all ${filtered.length} tickets (open + closed).`
                : `Showing ${openCount} open. ${closedCount} closed - enable "Include closed" or "Recently closed (7 days)" or search to see them.`}
        </p>
      </div>
      {filtered.length === 0 ? (
        <p className="form-note">
          {search.trim()
            ? "No tickets match your search."
            : recentlyClosedOnly
              ? "No tickets closed in the last 7 days."
              : includeClosed
                ? "No tickets yet."
                : 'No open tickets. Enable "Include closed" or "Recently closed (7 days)" or search to find them.'}
        </p>
      ) : (
        <>
          <ul className="ticket-list">
            {paginated.map((t) => (
              <li key={t.id} className="ticket-item">
                <div>
                  <Link href={`/va/${t.id}`}>
                    #{t.ticket_number} {t.subject}
                  </Link>
                  <span
                    className="ticket-meta"
                    style={{ marginLeft: "var(--space-sm)", display: "block" }}
                  >
                    {getStatusLabel(t.status)}
                    {t.assigned_va_id && (
                      <> · {vaDisplayNames[t.assigned_va_id] ?? "Specialist"}</>
                    )}
                    {" · "}
                    {formatInCentral(t.updated_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                gap: "var(--space-md)",
                marginTop: "var(--space-md)",
                alignItems: "center",
              }}
            >
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
    </>
  );
}
