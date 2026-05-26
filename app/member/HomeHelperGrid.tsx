"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TaskLibraryItem } from "@/lib/task-library";
import { bringInHelper } from "./helpers/actions";

type Props = {
  helpers: TaskLibraryItem[];
};

function helperName(taskName: string): string {
  if (/helper$/i.test(taskName.trim())) return taskName;
  return `${taskName} Helper`;
}

export default function HomeHelperGrid({ helpers }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleBringIn(helperId: string) {
    setError(null);
    setPendingId(helperId);
    startTransition(async () => {
      const result = await bringInHelper(helperId);
      if (result.error || !result.ticketId) {
        setError(result.error ?? "Something went wrong. Please try again.");
        setPendingId(null);
        return;
      }
      router.push(`/member/helpers/${result.ticketId}/sent`);
    });
  }

  return (
    <div>
      {error && (
        <div
          role="alert"
          style={{
            marginBottom: "var(--space-md)",
            padding: "var(--space-sm) var(--space-md)",
            background: "var(--color-error-bg, #fef2f2)",
            color: "var(--color-error, #b91c1c)",
            borderRadius: "var(--radius, 6px)",
            borderLeft: "3px solid var(--color-error, #b91c1c)",
            fontSize: "0.9375rem",
          }}
        >
          {error}
        </div>
      )}
      <div
        style={{
          display: "grid",
          gap: "var(--space-md)",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        }}
      >
        {helpers.map((h) => {
          const busy = pendingId === h.id && isPending;
          return (
            <article
              key={h.id}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-sm)",
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--accent, #b8860b)",
                  fontWeight: 600,
                }}
              >
                {h.category}
              </span>
              <h3
                style={{
                  fontSize: "1.0625rem",
                  margin: 0,
                  fontWeight: 600,
                  lineHeight: 1.3,
                  flex: 1,
                }}
              >
                {helperName(h.task)}
              </h3>
              <button
                type="button"
                onClick={() => handleBringIn(h.id)}
                disabled={busy || isPending}
                className="btn btn-primary"
                style={{
                  marginTop: "var(--space-xs)",
                  textAlign: "center",
                  opacity: busy || isPending ? 0.7 : 1,
                  cursor: busy || isPending ? "wait" : "pointer",
                }}
              >
                {busy ? "Bringing in…" : "Bring this helper in"}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
