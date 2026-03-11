"use client";

export default function VAError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDev = process.env.NODE_ENV === "development";
  return (
    <div className="app-shell" style={{ padding: "var(--space-xl) var(--space-md)", textAlign: "center" }}>
      <h1 className="page-title">Something went wrong</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        We couldn&apos;t load the VA dashboard. Try refreshing, or head back to the home page.
      </p>
      {isDev && error?.message && (
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
          }}
        >
          {error.message}
        </pre>
      )}
      <div style={{ display: "flex", gap: "var(--space-md)", justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <a href="/" className="btn btn-secondary">
          Back to home
        </a>
      </div>
    </div>
  );
}
