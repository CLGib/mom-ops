"use client";

import Link from "next/link";

type Props = {
  prevTicketId: string | null;
  nextTicketId: string | null;
};

/** Play-mode nav: Previous / Next task in inbox, or "Up to date — claim more tasks?" when no next. */
export default function VAInboxNav({ prevTicketId, nextTicketId }: Props) {
  const hasPrev = prevTicketId != null;
  const hasNext = nextTicketId != null;

  if (!hasPrev && !hasNext) {
    return (
      <div
        className="va-inbox-nav"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "var(--space-md)",
          marginBottom: "var(--space-md)",
          padding: "var(--space-sm) 0",
        }}
      >
        <span style={{ fontSize: "0.9375rem", color: "var(--text-soft, #666)" }}>
          Up to date — claim more tasks?
        </span>
        <Link href="/va/tasks" className="btn btn-primary" style={{ padding: "var(--space-2xs) var(--space-md)" }}>
          Claim more tasks
        </Link>
      </div>
    );
  }

  return (
    <div
      className="va-inbox-nav"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "var(--space-md)",
        marginBottom: "var(--space-md)",
        padding: "var(--space-sm) 0",
      }}
    >
      {hasPrev && (
        <Link
          href={`/va/${prevTicketId}`}
          className="btn btn-secondary"
          style={{ padding: "var(--space-2xs) var(--space-md)", fontSize: "0.875rem" }}
        >
          ← Previous
        </Link>
      )}
      {hasNext ? (
        <Link
          href={`/va/${nextTicketId}`}
          className="btn btn-primary"
          style={{ padding: "var(--space-2xs) var(--space-md)", fontSize: "0.875rem" }}
        >
          Next task →
        </Link>
      ) : (
        <>
          <span style={{ fontSize: "0.9375rem", color: "var(--text-soft, #666)" }}>
            Up to date — claim more tasks?
          </span>
          <Link href="/va/tasks" className="btn btn-primary" style={{ padding: "var(--space-2xs) var(--space-md)" }}>
            Claim more tasks
          </Link>
        </>
      )}
    </div>
  );
}
