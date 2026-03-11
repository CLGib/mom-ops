"use client";

export default function ToolboxError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="app-shell" style={{ padding: "var(--space-xl) var(--space-md)", textAlign: "center" }}>
      <h1 className="page-title">Something went wrong</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        We couldn’t load the VA Toolbox. This can happen if the page is still updating. Try refreshing, or head back to your dashboard.
      </p>
      <div style={{ display: "flex", gap: "var(--space-md)", justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <a href="/va" className="btn btn-secondary">
          Back to VA Dashboard
        </a>
      </div>
    </div>
  );
}
