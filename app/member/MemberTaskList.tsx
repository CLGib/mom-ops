"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatInCentral } from "@/lib/format-date";

type Ticket = {
  id: string;
  subject: string;
  description: string | null;
  status: string;
  created_at: string;
};

export default function MemberTaskList({ tickets }: { tickets: Ticket[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return tickets.filter((t) => t.status !== "closed");
    }
    return tickets.filter((t) => {
      const matchSubject = t.subject?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      return matchSubject || matchDesc;
    });
  }, [tickets, search]);

  if (tickets.length === 0) {
    return (
      <p className="form-note">No tasks yet. Submit one above when your subscription is active.</p>
    );
  }

  const openCount = tickets.filter((t) => t.status !== "closed").length;
  const closedCount = tickets.filter((t) => t.status === "closed").length;

  return (
    <>
      <div className="form-group" style={{ marginBottom: "var(--space-sm)" }}>
        <input
          id="task-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by subject or description (includes closed tasks)"
          aria-label="Search tasks (includes closed)"
          className="input"
          style={{ width: "100%", maxWidth: "20rem" }}
          aria-describedby="task-search-hint"
        />
        <p id="task-search-hint" className="form-note" style={{ marginTop: "var(--space-xs)", marginBottom: 0 }}>
          {search.trim()
            ? `Showing ${filtered.length} matching task${filtered.length !== 1 ? "s" : ""}`
            : `${openCount} open task${openCount !== 1 ? "s" : ""}${closedCount > 0 ? `, ${closedCount} closed — use search to find closed tasks.` : "."}`}
        </p>
      </div>
      {filtered.length === 0 ? (
        <p className="form-note">
          {search.trim()
            ? "No tasks match your search."
            : "No open tasks. Submit one above or search to find closed tasks."}
        </p>
      ) : (
        <ul className="ticket-list">
          {filtered.map((t) => (
            <li key={t.id} className="ticket-item">
              <div>
                <Link href={`/member/${t.id}`}>{t.subject}</Link>
                <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)" }}>
                  {t.status} – {formatInCentral(t.created_at)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
