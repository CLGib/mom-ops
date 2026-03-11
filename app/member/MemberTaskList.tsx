"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatInCentral } from "@/lib/format-date";
import { getStatusLabel } from "@/lib/ticket-status";

const PAGE_SIZE = 20;

const HIDDEN_STATUSES = ["closed", "cancelled_by_va", "cancelled_by_admin"] as const;
const isHidden = (status: string) => HIDDEN_STATUSES.includes(status as (typeof HIDDEN_STATUSES)[number]);

type Ticket = {
  id: string;
  subject: string;
  description: string | null;
  status: string;
  created_at: string;
};

const CANCELLED_STATUSES = ["cancelled_by_va", "cancelled_by_admin"] as const;
const isCancelled = (status: string) => CANCELLED_STATUSES.includes(status as (typeof CANCELLED_STATUSES)[number]);

export default function MemberTaskList({ tickets }: { tickets: Ticket[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return tickets.filter((t) => !isHidden(t.status));
    }
    // When searching: include cancelled so they are findable
    return tickets.filter((t) => {
      const matchSubject = t.subject?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      return matchSubject || matchDesc;
    });
  }, [tickets, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = useMemo(
    () => filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [filtered, currentPage]
  );

  if (tickets.length === 0) {
    return (
      <p className="form-note">No tasks yet. Submit one above when your subscription is active.</p>
    );
  }

  const openCount = tickets.filter((t) => !isHidden(t.status)).length;
  const closedCount = tickets.filter((t) => isHidden(t.status) && !isCancelled(t.status)).length;

  return (
    <>
      <div className="form-group" style={{ marginBottom: "var(--space-sm)" }}>
        <input
          id="task-search"
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search by subject or description. Canceled tasks are searchable."
          aria-label="Search tasks"
          className="input"
          style={{ width: "100%", maxWidth: "20rem" }}
          aria-describedby="task-search-hint"
        />
        <p id="task-search-hint" className="form-note" style={{ marginTop: "var(--space-xs)", marginBottom: 0 }}>
          {search.trim()
            ? `Showing ${filtered.length} matching task${filtered.length !== 1 ? "s" : ""}`
            : `${openCount} open task${openCount !== 1 ? "s" : ""}${closedCount > 0 ? `, ${closedCount} closed. Use search to find them.` : "."} Canceled tasks are hidden but searchable.`}
        </p>
      </div>
      {filtered.length === 0 ? (
        <p className="form-note">
          {search.trim()
            ? "No tasks match your search."
            : "No open tasks. Submit one above or search to find closed tasks."}
        </p>
      ) : (
        <>
        <ul className="member-task-cards" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {paginated.map((t) => (
            <li
              key={t.id}
              className="member-task-card"
              style={{
                padding: "var(--space-md)",
                marginBottom: "var(--space-sm)",
                border: "1px solid var(--color-border, #e5e5e5)",
                borderRadius: "var(--radius, 6px)",
                backgroundColor: "var(--color-bg, #fff)",
              }}
            >
              <div className="member-task-card__content">
                <span className="member-task-card__status">
                  {getStatusLabel(t.status)}
                </span>
                <strong className="member-task-card__subject">{t.subject || "Task"}</strong>
                <span className="member-task-card__date">
                  {formatInCentral(t.created_at)}
                </span>
                <Link
                  href={`/member/${t.id}`}
                  className="btn btn-primary member-task-card__action"
                >
                  View
                </Link>
              </div>
            </li>
          ))}
        </ul>
        {totalPages > 1 && (
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
    </>
  );
}
