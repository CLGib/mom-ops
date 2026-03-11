"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatInCentral } from "@/lib/format-date";
import { getStatusLabel } from "@/lib/ticket-status";

type Ticket = {
  id: string;
  ticket_number?: number | null;
  subject: string;
  status: string;
  credit_cost: number | null;
  tip_amount: number | null;
  created_at: string;
  updated_at?: string;
  assigned_va_id?: string | null;
};

type Props = {
  /** All tasks (assigned + unassigned) for search; unassigned-to-me = read-only when viewing */
  allTickets: Ticket[];
  currentUserId: string;
};

export default function VATasksPageSearch({ allTickets, currentUserId }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const qNum = parseInt(q, 10);
    const matchTicketNum = !Number.isNaN(qNum) && String(qNum) === q;
    return allTickets.filter((t) => {
      const matchSubject = t.subject?.toLowerCase().includes(q);
      const matchStatus = getStatusLabel(t.status).toLowerCase().includes(q);
      const matchNumber = matchTicketNum && t.ticket_number != null && t.ticket_number === qNum;
      return matchSubject || matchStatus || matchNumber;
    });
  }, [allTickets, search]);

  return (
    <section style={{ marginBottom: "var(--space-xl)" }}>
      <div className="form-group" style={{ marginBottom: "var(--space-sm)" }}>
        <input
          id="va-tasks-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search all tasks (including closed or completed)"
          aria-label="Search all tasks"
          className="input"
          style={{ width: "100%", maxWidth: "28rem" }}
          aria-describedby="va-tasks-search-hint"
        />
        <p id="va-tasks-search-hint" className="form-note" style={{ marginTop: "var(--space-2xs)", marginBottom: 0 }}>
          {search.trim()
            ? `Showing ${filtered.length} matching task${filtered.length !== 1 ? "s" : ""}`
            : "Search by task #, subject, or status to find any task. Tasks not assigned to you open in read-only mode."}
        </p>
      </div>
      <div style={{ marginTop: "var(--space-sm)" }}>
        <Link
          href="/va/tickets"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "var(--space-2xs) var(--space-md)",
            borderRadius: "9999px",
            fontSize: "0.875rem",
          }}
        >
          See all tasks
        </Link>
      </div>
      {search.trim() && (
        <>
          {filtered.length === 0 ? (
            <p className="form-note">No tasks match your search.</p>
          ) : (
            <ul className="ticket-list">
              {filtered.map((t) => {
                const isAssignedToMe = t.assigned_va_id === currentUserId;
                return (
                  <li key={t.id} className="ticket-item">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/va/${t.id}`}>
                        #{t.ticket_number ?? t.id.slice(0, 8)} {t.subject}
                      </Link>
                      <span
                        className="ticket-meta"
                        style={{ marginLeft: "var(--space-sm)", display: "block" }}
                      >
                        {getStatusLabel(t.status)}
                        {!isAssignedToMe && (
                          <span style={{ marginLeft: "var(--space-xs)", fontSize: "0.75rem", color: "var(--text-soft, #666)" }}>
                            · read-only
                          </span>
                        )}
                        {" · "}
                        {formatInCentral(t.updated_at ?? t.created_at)}
                        {t.tip_amount != null && t.tip_amount > 0 && (
                          <> · Tip: ${(t.tip_amount / 100).toFixed(2)}</>
                        )}
                      </span>
                    </div>
                    <Link href={`/va/${t.id}`} className="btn btn-secondary" style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem", flexShrink: 0 }}>
                      View
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
