"use client";

import { useState } from "react";

type Props = { founderCount: number };

export default function BackfillFoundingMemberWelcomeButton({ founderCount }: Props) {
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendTestEmail() {
    setTestLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/send-test-founders-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to send test email.");
        return;
      }
      setMessage(data.message ?? "Test email sent.");
    } catch {
      setError("Something went wrong.");
    } finally {
      setTestLoading(false);
    }
  }

  async function runBackfill(resend: boolean) {
    const setLoadingState = resend ? setResendLoading : setLoading;
    setLoadingState(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/backfill-founding-member-welcome", {
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

  return (
    <div style={{ marginTop: "var(--space-md)", display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
      <button
        type="button"
        onClick={sendTestEmail}
        disabled={testLoading || loading || resendLoading}
        className="btn btn-secondary"
      >
        {testLoading ? "Sending…" : "Send test founders launch email to my email"}
      </button>
      {founderCount > 0 && (
        <>
          <button
            type="button"
            onClick={() => runBackfill(false)}
            disabled={testLoading || loading || resendLoading}
            className="btn btn-secondary"
          >
            {loading ? "Sending…" : "Send founding member welcome to all current founders (one-time backfill)"}
          </button>
          <button
            type="button"
            onClick={() => runBackfill(true)}
            disabled={testLoading || loading || resendLoading}
            className="btn btn-secondary"
          >
            {resendLoading ? "Sending…" : "Resend founding member welcome to all founders (one more time)"}
          </button>
        </>
      )}
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
