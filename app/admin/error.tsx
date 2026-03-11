"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin dashboard error:", error?.message, error?.digest);
  }, [error]);

  const showDetail =
    process.env.NODE_ENV === "development" ||
    (typeof window !== "undefined" && (error?.message ?? error?.digest));

  return (
    <div className="app-shell" style={{ padding: "var(--space-xl) var(--space-md)", textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
      <h1 className="page-title">Something went wrong</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        We couldn&apos;t load the admin dashboard. Try again or log out and sign back in.
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
        <a href="/api/auth/signout?next=/admin" className="btn btn-secondary">
          Log out
        </a>
        <a href="/" className="btn btn-secondary">
          Go home
        </a>
      </div>
    </div>
  );
}
