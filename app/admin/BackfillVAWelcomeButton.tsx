"use client";

import { useState } from "react";

type Props = { vaCount: number };

export default function BackfillVAWelcomeButton({ vaCount }: Props) {
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runBackfill(resend: boolean) {
    const setLoadingState = resend ? setResendLoading : setLoading;
    setLoadingState(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/backfill-va-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(resend ? { resend: true } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Backfill failed.");
        return;
      }
      setMessage(data.message ?? "Done.");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoadingState(false);
    }
  }

  if (vaCount === 0) return null;

  return (
    <div style={{ marginTop: "var(--space-md)", display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
      <button
        type="button"
        onClick={() => runBackfill(false)}
        disabled={loading || resendLoading}
        className="btn btn-secondary"
      >
        {loading ? "Sending…" : "Send welcome email to all current VAs (one-time backfill)"}
      </button>
      <button
        type="button"
        onClick={() => runBackfill(true)}
        disabled={loading || resendLoading}
        className="btn btn-secondary"
      >
        {resendLoading ? "Sending…" : "Resend welcome email to all VAs (one more time)"}
      </button>
      {message && (
        <p className="form-note" style={{ marginTop: "var(--space-sm)", color: "var(--color-muted)" }}>
          {message}
        </p>
      )}
      {error && (
        <p className="form-error" style={{ marginTop: "var(--space-sm)" }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
