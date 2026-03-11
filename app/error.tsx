"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error boundary:", error.message, error.digest);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";
  const showDetail = isDev || typeof window !== "undefined";

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
        We couldn&apos;t load this page. Try refreshing or going back.
      </p>
      {showDetail && error?.message && (
        <pre
          style={{
            textAlign: "left",
            padding: "var(--space-md)",
            background: "var(--color-muted-bg, #f5f5f5)",
            borderRadius: 8,
            fontSize: "0.8125rem",
            overflow: "auto",
            maxWidth: "100%",
            marginBottom: "var(--space-lg)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {error.message}
          {error.digest && `\n(digest: ${error.digest})`}
        </pre>
      )}
      <div style={{ display: "flex", gap: "var(--space-md)", justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <a href="/" className="btn btn-secondary">
          Go home
        </a>
      </div>
    </div>
  );
}
