"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatInCentral } from "@/lib/format-date";
import { PaginatedList } from "../components/PaginatedList";

const PAGE_SIZE = 20;
const CANCELLED_STATUSES = ["cancelled_by_va", "cancelled_by_admin"] as const;
const isCancelled = (status: string) => CANCELLED_STATUSES.includes(status as (typeof CANCELLED_STATUSES)[number]);

type Ticket = {
  id: string;
  ticket_number: number;
  subject: string;
  status: string;
  member_id: string;
  assigned_va_id: string | null;
  created_at: string;
  completed_at: string | null;
};

type Props = { tickets: Ticket[] };

export default function DirectorTaskList({ tickets }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return tickets.filter((t) => !isCancelled(t.status));
    }
    const qNum = parseInt(q, 10);
    const matchTicketNum = !Number.isNaN(qNum) && String(qNum) === q;
    return tickets.filter((t) => {
      const matchSubject = t.subject?.toLowerCase().includes(q);
      const matchStatus = t.status?.toLowerCase().includes(q);
      const matchMember = t.member_id?.toLowerCase().includes(q);
      const matchNumber = matchTicketNum && t.ticket_number === qNum;
      return matchSubject || matchStatus || matchMember || matchNumber;
    });
  }, [tickets, search]);

  const nonCancelledCount = tickets.filter((t) => !isCancelled(t.status)).length;
  const cancelledCount = tickets.filter((t) => isCancelled(t.status)).length;

  return (
    <>
      <div className="form-group" style={{ marginBottom: "var(--space-sm)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-md)" }}>
        <input
          type="search"
          className="input"
          placeholder="Search by #, subject, status, or member id. Canceled tasks are searchable."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "20rem" }}
          aria-label="Search tasks"
        />
        <p className="form-note" style={{ margin: 0, width: "100%" }}>
          {search.trim()
            ? `Showing ${filtered.length} matching task${filtered.length !== 1 ? "s" : ""}`
            : `Showing ${nonCancelledCount} task${nonCancelledCount !== 1 ? "s" : ""}. ${cancelledCount > 0 ? `${cancelledCount} canceled (search to find them).` : ""}`}
        </p>
      </div>
      {filtered.length === 0 ? (
        <p className="form-note">
          {search.trim() ? "No tasks match your search." : "No tasks yet."}
        </p>
      ) : (
        <PaginatedList items={filtered} pageSize={PAGE_SIZE} listClassName="ticket-list">
          {(t) => (
            <div className="ticket-item" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--space-sm)" }}>
              <div>
                <Link href={`/admin/${t.id}`}>#{t.ticket_number} {t.subject}</Link>
                <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)" }}>
                  {t.status} · {formatInCentral(t.created_at)}
                </span>
              </div>
              <Link href={`/admin/${t.id}`} className="btn btn-secondary">
                View
              </Link>
            </div>
          )}
        </PaginatedList>
      )}
    </>
  );
}
