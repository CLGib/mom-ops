"use client";

import { useEffect, useState } from "react";

export default function MemberError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => {
    console.error("[member] Page error:", error.message, error.digest, error);
  }, [error]);

  return (
    <div
      className="app-shell"
      style={{
        padding: "var(--space-xl) var(--space-md)",
        textAlign: "center",
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      <h1 className="page-title">Something went wrong</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        We couldn&apos;t load this page. Try refreshing or going back to{" "}
        <a href="/member" className="link">Home</a>.
      </p>
      <div style={{ display: "flex", gap: "var(--space-md)", justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <a href="/member" className="btn btn-secondary">
          Go home
        </a>
      </div>
      <p style={{ marginTop: "var(--space-xl)" }}>
        <button
          type="button"
          onClick={() => setShowDetails((d) => !d)}
          className="link"
          style={{ fontSize: "0.875rem" }}
        >
          {showDetails ? "Hide" : "Show"} error details
        </button>
      </p>
      {showDetails && (
        <pre
          style={{
            textAlign: "left",
            fontSize: "0.75rem",
            overflow: "auto",
            padding: "var(--space-md)",
            background: "var(--color-muted-bg, #f5f5f5)",
            borderRadius: 4,
            marginTop: "var(--space-sm)",
          }}
        >
          {error.message}
        </pre>
      )}
    </div>
  );
}
