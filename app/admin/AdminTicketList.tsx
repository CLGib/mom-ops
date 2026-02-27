"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatInCentral } from "@/lib/format-date";

type Ticket = {
  id: string;
  subject: string;
  description: string | null;
  status: string;
  member_id: string;
  assigned_va_id: string | null;
  created_at: string;
  rating?: number | null;
  feedback?: string | null;
};

export default function AdminTicketList({ tickets }: { tickets: Ticket[] }) {
  const [search, setSearch] = useState("");
  const [includeClosed, setIncludeClosed] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      return tickets.filter((t) => {
        const matchSubject = t.subject?.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchMember = t.member_id?.toLowerCase().includes(q);
        return matchSubject || matchDesc || matchMember;
      });
    }
    if (includeClosed) return tickets;
    return tickets.filter((t) => t.status !== "closed");
  }, [tickets, search, includeClosed]);

  const openCount = tickets.filter((t) => t.status !== "closed").length;
  const closedCount = tickets.filter((t) => t.status === "closed").length;

  return (
    <>
      <div className="form-group" style={{ marginBottom: "var(--space-sm)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-md)" }}>
        <input
          id="admin-ticket-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tickets (subject, description, member id)"
          aria-label="Search tickets"
          className="input"
          style={{ width: "100%", maxWidth: "20rem" }}
          aria-describedby="admin-ticket-search-hint"
        />
        <label style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", fontSize: "0.9rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={includeClosed}
            onChange={(e) => setIncludeClosed(e.target.checked)}
            aria-label="Include closed tickets"
          />
          Include closed
        </label>
        <p id="admin-ticket-search-hint" className="form-note" style={{ margin: 0, width: "100%" }}>
          {search.trim()
            ? `Showing ${filtered.length} matching ticket${filtered.length !== 1 ? "s" : ""}`
            : includeClosed
              ? `Showing all ${tickets.length} tickets.`
              : `Showing ${openCount} open ticket${openCount !== 1 ? "s" : ""}. ${closedCount > 0 ? `${closedCount} closed — search or enable "Include closed" to see them.` : ""}`}
        </p>
      </div>
      {filtered.length === 0 ? (
        <p className="form-note">
          {search.trim()
            ? "No tickets match your search."
            : includeClosed
              ? "No tickets."
              : "No open tickets. Enable \"Include closed\" or search to find closed tickets."}
        </p>
      ) : (
        <ul className="ticket-list">
          {filtered.map((t) => (
            <li key={t.id} className="ticket-item">
              <div>
                <Link href={`/admin/${t.id}`}>{t.subject}</Link>
                <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)" }}>
                  {t.status}
                  {t.rating != null && ` · ${t.rating}/5`}
                  {` – member: ${t.member_id?.slice(0, 8)}… – ${formatInCentral(t.created_at)}`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
