"use client";

import Link from "next/link";
import { formatInCentral } from "@/lib/format-date";
import { PaginatedList } from "../components/PaginatedList";
import AdminClaimTicketButton from "./AdminClaimTicketButton";

type TicketRow = {
  id: string;
  ticket_number?: number | null;
  subject: string;
  member_id: string;
  created_at: string;
};

export default function AdminUnassignedTicketsList({
  items,
  memberDisplayNames = {},
  memberEmails = {},
}: {
  items: TicketRow[];
  memberDisplayNames?: Record<string, string>;
  memberEmails?: Record<string, string>;
}) {
  if (items.length === 0) return null;
  const names = memberDisplayNames && typeof memberDisplayNames === "object" ? memberDisplayNames : {};
  const emails = memberEmails && typeof memberEmails === "object" ? memberEmails : {};
  return (
    <PaginatedList items={items} listClassName="ticket-list">
      {(t) => {
        const memberName = names[t.member_id] ?? (t.member_id ? t.member_id.slice(0, 8) + "…" : "—");
        const memberEmail = emails[t.member_id] ?? "";
        const memberLabel = memberEmail ? `${memberName} (${memberEmail})` : memberName;
        return (
        <div
          className="ticket-item"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-sm)",
          }}
        >
          <div>
            <Link href={`/admin/${t.id}`}>
              #{t.ticket_number ?? t.id.slice(0, 8)} {t.subject}
            </Link>
            <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)" }}>
              Member: {memberLabel} · {formatInCentral(t.created_at)}
            </span>
          </div>
          <AdminClaimTicketButton ticketId={t.id} />
        </div>
        );
      }}
    </PaginatedList>
  );
}
