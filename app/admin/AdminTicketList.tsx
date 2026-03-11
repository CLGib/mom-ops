"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatInCentral } from "@/lib/format-date";

const PAGE_SIZE = 20;

type Ticket = {
  id: string;
  ticket_number?: number | null;
  subject: string;
  description: string | null;
  status: string;
  member_id: string;
  assigned_va_id: string | null;
  created_at: string;
  rating?: number | null;
  feedback?: string | null;
};

const HIDDEN_STATUSES = ["closed", "cancelled_by_va", "cancelled_by_admin"] as const;
const isHidden = (status: string) => HIDDEN_STATUSES.includes(status as (typeof HIDDEN_STATUSES)[number]);
const CANCELLED_STATUSES = ["cancelled_by_va", "cancelled_by_admin"] as const;
const isCancelled = (status: string) => CANCELLED_STATUSES.includes(status as (typeof CANCELLED_STATUSES)[number]);

export default function AdminTicketList({
  tickets,
  vaDisplayNames = {},
  memberDisplayNames = {},
  memberEmails = {},
  ticketIdsNeedingReview = [],
}: {
  tickets: Ticket[];
  vaDisplayNames?: Record<string, string>;
  memberDisplayNames?: Record<string, string>;
  memberEmails?: Record<string, string>;
  /** Ticket IDs that have VA messages pending CEO review (training mode). */
  ticketIdsNeedingReview?: string[];
}) {
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const safeVaDisplayNames = vaDisplayNames && typeof vaDisplayNames === "object" ? vaDisplayNames : {};
  const safeMemberDisplayNames = memberDisplayNames && typeof memberDisplayNames === "object" ? memberDisplayNames : {};
  const safeMemberEmails = memberEmails && typeof memberEmails === "object" ? memberEmails : {};
  const needReviewSet = useMemo(
    () => new Set(Array.isArray(ticketIdsNeedingReview) ? ticketIdsNeedingReview : []),
    [ticketIdsNeedingReview]
  );
  const searchParams = useSearchParams();
  const needsReviewFromUrl = searchParams.get("needsReview") === "1";
  const [search, setSearch] = useState("");
  const [includeClosed, setIncludeClosed] = useState(needsReviewFromUrl);
  const [needsReviewOnly, setNeedsReviewOnly] = useState(needsReviewFromUrl);
  const [filterMemberId, setFilterMemberId] = useState("");
  const [filterVaId, setFilterVaId] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#admin-all-tickets") {
      document.getElementById("admin-all-tickets")?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const memberOptions = useMemo(() => {
    const ids = [...new Set(safeTickets.map((t) => t.member_id).filter(Boolean))];
    return ids
      .map((id) => {
        const name = safeMemberDisplayNames[id] ?? "";
        const email = safeMemberEmails[id] ?? "";
        const label = name && email ? `${name} (${email})` : name || email || id.slice(0, 8) + "…";
        return { id, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [safeTickets, safeMemberDisplayNames, safeMemberEmails]);

  const vaOptions = useMemo(() => {
    const unassigned = { id: "__unassigned__", label: "Unassigned" };
    const ids = [...new Set(safeTickets.map((t) => t.assigned_va_id).filter(Boolean))] as string[];
    const list = ids
      .map((id) => ({
        id,
        label: safeVaDisplayNames[id] ?? id.slice(0, 8) + "…",
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    return [unassigned, ...list];
  }, [safeTickets, safeVaDisplayNames]);

  const sortNeedingReviewFirst = (list: Ticket[]) =>
    [...list].sort((a, b) => {
      const aNeed = needReviewSet.has(a?.id ?? "");
      const bNeed = needReviewSet.has(b?.id ?? "");
      if (aNeed && !bNeed) return -1;
      if (!aNeed && bNeed) return 1;
      return 0;
    });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const excludeCancelled = (list: Ticket[]) => list.filter((t) => !isCancelled(t.status));
    const byNeedsReview = (list: Ticket[]) =>
      needsReviewOnly ? list.filter((t) => needReviewSet.has(t?.id ?? "")) : list;
    let list: Ticket[];
    if (q) {
      // When searching: include cancelled so they are findable
      const qNum = parseInt(q, 10);
      const matchTicketNum = !Number.isNaN(qNum) && String(qNum) === q;
      list = safeTickets.filter((t) => {
        const matchSubject = t.subject?.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchMemberId = t.member_id?.toLowerCase().includes(q);
        const matchMemberName = safeMemberDisplayNames[t.member_id]?.toLowerCase().includes(q);
        const matchMemberEmail = safeMemberEmails[t.member_id]?.toLowerCase().includes(q);
        const matchNumber = matchTicketNum && t.ticket_number != null && t.ticket_number === qNum;
        return matchSubject || matchDesc || matchMemberId || matchMemberName || matchMemberEmail || matchNumber;
      });
    } else if (includeClosed) {
      list = excludeCancelled(safeTickets);
    } else {
      list = safeTickets.filter((t) => !isHidden(t.status));
    }
    if (filterMemberId) {
      list = list.filter((t) => t.member_id === filterMemberId);
    }
    if (filterVaId) {
      if (filterVaId === "__unassigned__") {
        list = list.filter((t) => !t.assigned_va_id);
      } else {
        list = list.filter((t) => t.assigned_va_id === filterVaId);
      }
    }
    return sortNeedingReviewFirst(byNeedsReview(list));
  }, [safeTickets, search, includeClosed, needsReviewOnly, needReviewSet, safeMemberDisplayNames, safeMemberEmails, filterMemberId, filterVaId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = useMemo(
    () => filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [filtered, currentPage]
  );

  const openCount = safeTickets.filter((t) => !isHidden(t.status)).length;
  const closedCount = safeTickets.filter((t) => isHidden(t.status) && !isCancelled(t.status)).length;

  return (
    <>
      <div className="form-group" style={{ marginBottom: "var(--space-sm)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-md)" }}>
        <input
          id="admin-ticket-search"
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search by #, subject, description, member name or email. Canceled tickets are searchable."
          aria-label="Search tickets"
          className="input"
          style={{ width: "100%", maxWidth: "20rem" }}
          aria-describedby="admin-ticket-search-hint"
        />
        <label style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", fontSize: "0.9rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={includeClosed}
            onChange={(e) => {
              setIncludeClosed(e.target.checked);
              setPage(0);
            }}
            aria-label="Include closed tickets"
          />
          Include closed
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", fontSize: "0.9rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={needsReviewOnly}
            onChange={(e) => {
              setNeedsReviewOnly(e.target.checked);
              setPage(0);
            }}
            aria-label="Show only tickets needing review"
          />
          Needs review only
        </label>
        <label htmlFor="admin-filter-member" style={{ fontSize: "0.9rem" }}>
          Member
        </label>
        <select
          id="admin-filter-member"
          aria-label="Filter by member"
          className="input"
          style={{ minWidth: "12rem" }}
          value={filterMemberId}
          onChange={(e) => {
            setFilterMemberId(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All members</option>
          {memberOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label.length > 48 ? opt.label.slice(0, 45) + "…" : opt.label}
            </option>
          ))}
        </select>
        <label htmlFor="admin-filter-va" style={{ fontSize: "0.9rem" }}>
          Specialist
        </label>
        <select
          id="admin-filter-va"
          aria-label="Filter by specialist"
          className="input"
          style={{ minWidth: "10rem" }}
          value={filterVaId}
          onChange={(e) => {
            setFilterVaId(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All specialists</option>
          {vaOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        <p id="admin-ticket-search-hint" className="form-note" style={{ margin: 0, width: "100%" }}>
          {search.trim()
            ? `Showing ${filtered.length} matching ticket${filtered.length !== 1 ? "s" : ""}${needsReviewOnly ? " (needs review only)" : ""}${filterMemberId || filterVaId ? " (filtered by member/specialist)" : ""}.`
            : needsReviewOnly
              ? `Showing ${filtered.length} ticket${filtered.length !== 1 ? "s" : ""} needing review${filterMemberId || filterVaId ? " (filtered)" : ""}.`
              : includeClosed
                ? `Showing ${filtered.length} ticket${filtered.length !== 1 ? "s" : ""}${filterMemberId || filterVaId ? " (filtered)" : ""}.`
                : `Showing ${filtered.length} ticket${filtered.length !== 1 ? "s" : ""}${filterMemberId || filterVaId ? " (filtered)" : ""}. ${!filterMemberId && !filterVaId ? (closedCount > 0 ? `${closedCount} closed. ` : "") + "Search or enable \"Include closed\" to see them. " : ""}Canceled tickets are hidden but searchable.`}
        </p>
      </div>
      {filtered.length === 0 ? (
        <p className="form-note">
          {filterMemberId || filterVaId
            ? "No tickets match the selected member or specialist. Clear filters to see more."
            : needsReviewOnly
              ? "No tickets need review right now."
              : search.trim()
                ? "No tickets match your search."
                : includeClosed
                  ? "No tickets."
                  : "No open tickets. Enable \"Include closed\" or search to find them."}
        </p>
      ) : (
        <>
          <ul className="ticket-list">
            {paginated.map((t) => (
              <li key={t?.id ?? String(Math.random())} className="ticket-item">
                <div>
                  <Link href={`/admin/${t?.id ?? ""}`}>#{t?.ticket_number ?? (t?.id ? t.id.slice(0, 8) : "—")} {t?.subject ?? ""}</Link>
                  {t?.id && needReviewSet.has(t.id) && (
                    <span
                      className="badge"
                      style={{
                        marginLeft: "var(--space-xs)",
                        background: "var(--color-accent, #b8860b)",
                        color: "#fff",
                        fontSize: "0.75rem",
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}
                      title="Specialist message(s) waiting for your approval before the member sees them"
                    >
                      Needs review
                    </span>
                  )}
                  <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)" }}>
                    {t?.assigned_va_id
                      ? `Assigned to: ${safeVaDisplayNames[t.assigned_va_id] ?? (t.assigned_va_id ? t.assigned_va_id.slice(0, 8) + "…" : "—")}`
                      : "Unassigned"}
                    {` · ${t?.status ?? "—"}`}
                    {t?.rating != null && ` · ${t.rating}/5`}
                    {` · Member: ${safeMemberDisplayNames[t?.member_id ?? ""] ?? (t?.member_id?.slice(0, 8) ?? "—")}${t?.member_id && safeMemberEmails[t.member_id] ? ` (${safeMemberEmails[t.member_id]})` : ""}`}
                    {` · ${formatInCentral(t?.created_at)}`}
                  </span>
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
