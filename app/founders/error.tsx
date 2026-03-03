"use client";

export default function FoundersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="section" style={{ padding: "var(--space-xl) var(--space-md)", textAlign: "center" }}>
      <h1 className="section-title">Something went wrong</h1>
      <p className="section-lead" style={{ marginBottom: "var(--space-lg)" }}>
        We couldn’t load this page. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="btn btn-primary"
      >
        Try again
      </button>
    </div>
  );
}
