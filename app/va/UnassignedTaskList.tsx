"use client";

import Link from "next/link";
import { formatInCentral } from "@/lib/format-date";
import { PaginatedList } from "../components/PaginatedList";
import ClaimTicketButton from "./ClaimTicketButton";

const HOT_UNCLAIMED_HOURS = 6;
const NO_RUSH_HOT_HOURS = 24;
const HOT_MS = HOT_UNCLAIMED_HOURS * 60 * 60 * 1000;
const NO_RUSH_HOT_MS = NO_RUSH_HOT_HOURS * 60 * 60 * 1000;

function isHot(createdAt: string, noRush?: boolean): boolean {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  return elapsed >= (noRush ? NO_RUSH_HOT_MS : HOT_MS);
}

function isNoRushWithinWindow(createdAt: string): boolean {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  return elapsed < NO_RUSH_HOT_MS;
}

type Ticket = {
  id: string;
  ticket_number?: number | null;
  subject: string;
  member_id: string;
  status?: string;
  created_at: string;
  requested_va_id: string | null;
  no_rush?: boolean;
  is_free_trial_task?: boolean | null;
  is_member_first_task?: boolean | null;
};

type Props = {
  tickets: Ticket[];
  currentUserId: string;
  onboardingComplete: boolean;
};

export default function UnassignedTaskList({ tickets, currentUserId, onboardingComplete }: Props) {
  if (tickets.length === 0) return null;

  return (
    <PaginatedList items={tickets} listClassName="ticket-list">
      {(t) => (
        <div className="ticket-item" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-xs)" }}>
          <Link href={`/va/${t.id}`}>#{t.ticket_number ?? t.id.slice(0, 8)} {t.subject}</Link>
          {t.is_free_trial_task && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "0.125rem 0.5rem",
                borderRadius: 4,
                backgroundColor: "var(--color-error-bg, #fef2f2)",
                color: "var(--color-error, #b91c1c)",
              }}
            >
              Free trial
            </span>
          )}
          {t.is_member_first_task && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "0.125rem 0.5rem",
                borderRadius: 4,
                backgroundColor: "var(--color-info-bg, #eff6ff)",
                color: "var(--color-info, #1d4ed8)",
              }}
            >
              1st time user
            </span>
          )}
          {t.no_rush && isNoRushWithinWindow(t.created_at) && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "0.125rem 0.5rem",
                borderRadius: 4,
                backgroundColor: "var(--accent-soft-bg, #f8f5ed)",
                color: "var(--accent, #b8860b)",
              }}
            >
              No rush
            </span>
          )}
          {isHot(t.created_at, t.no_rush) && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2xs)", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.125rem 0.5rem",
                  borderRadius: 4,
                  backgroundColor: "var(--color-error-bg, #fef2f2)",
                  color: "var(--color-error, #b91c1c)",
                }}
              >
                Hot
              </span>
              <span className="form-note" style={{ fontSize: "0.75rem" }}>
                Earn 10% more
              </span>
            </span>
          )}
          {t.status === "reopened" && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "0.125rem 0.5rem",
                borderRadius: 4,
                backgroundColor: "var(--accent-soft-bg, #f8f5ed)",
                color: "var(--accent, #b8860b)",
              }}
            >
              Reopened
            </span>
          )}
          {t.requested_va_id === currentUserId && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "0.125rem 0.5rem",
                borderRadius: 4,
                backgroundColor: "var(--accent-soft-bg, #f8f5ed)",
                color: "var(--accent, #b8860b)",
              }}
            >
              Requested you
            </span>
          )}
          <span className="ticket-meta">{formatInCentral(t.created_at)}</span>
          <ClaimTicketButton ticketId={t.id} subject={t.subject} onboardingComplete={onboardingComplete} />
        </div>
      )}
    </PaginatedList>
  );
}
