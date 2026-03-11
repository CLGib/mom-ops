"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PendingTasksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[member/pending] Tasks error:", error.message, error.digest);
  }, [error]);

  return (
    <main className="app-shell">
      <h1 className="page-title">Tasks</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        We couldn&apos;t load your tasks. Try again or go back to Home.
      </p>
      <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap" }}>
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/member" className="btn btn-secondary">
          Go home
        </Link>
      </div>
    </main>
  );
}
