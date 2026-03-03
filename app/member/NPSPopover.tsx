"use client";

import { useCallback, useEffect, useState } from "react";
import posthog from "posthog-js";

const SESSION_KEY = "nps-shown-session";
const PRODUCT_NAME = "Mom Ops";

export default function NPSPopover() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (typeof window === "undefined") return;
      try {
        if (sessionStorage.getItem(SESSION_KEY)) {
          setLoading(false);
          return;
        }
        const res = await fetch("/api/nps/eligibility", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && data.eligible === true) {
          setOpen(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const recordAndClose = useCallback(
    async (payload: { score?: number; comment?: string | null; dismissed: boolean }) => {
      setSubmitting(true);
      try {
        await fetch("/api/nps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        sessionStorage.setItem(SESSION_KEY, "1");
        setOpen(false);
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const handleSubmit = useCallback(() => {
    if (score == null || score < 0 || score > 10) return;
    posthog.capture("nps_submitted", {
      score,
      has_comment: comment.trim().length > 0,
    });
    recordAndClose({ score, comment: comment.trim() || null, dismissed: false });
  }, [score, comment, recordAndClose]);

  const handleDismiss = useCallback(() => {
    posthog.capture("nps_dismissed");
    recordAndClose({ dismissed: true });
  }, [recordAndClose]);

  if (!open || loading) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nps-title"
      aria-describedby="nps-body"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-md)",
        boxSizing: "border-box",
        background: "rgba(0,0,0,0.4)",
        overflow: "auto",
      }}
      onClick={(e) => e.target === e.currentTarget && handleDismiss()}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 400,
          maxHeight: "90vh",
          overflow: "auto",
          padding: "var(--space-xl)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="nps-title" style={{ margin: "0 0 var(--space-sm)", fontSize: "1.25rem", fontWeight: 600 }}>
          We&apos;d love your feedback!
        </h2>
        <p id="nps-body" className="form-note" style={{ margin: "0 0 var(--space-lg)", color: "var(--text-muted, #5c5955)" }}>
          How likely are you to recommend {PRODUCT_NAME} to a friend or colleague?
        </p>

        <div style={{ marginBottom: "var(--space-lg)" }}>
          <p style={{ margin: "0 0 var(--space-xs)", fontSize: "0.875rem", fontWeight: 500 }}>
            0 = Not at all likely · 10 = Extremely likely
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-xs)",
              marginTop: "var(--space-sm)",
            }}
          >
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setScore(i)}
                style={{
                  width: 32,
                  height: 32,
                  padding: 0,
                  borderRadius: 6,
                  border: score === i ? "2px solid var(--accent, #b8860b)" : "1px solid var(--border, #e8e6e2)",
                  background: score === i ? "var(--accent-soft-bg, #f8f5ed)" : "var(--surface, #fff)",
                  color: "var(--text, #1a1917)",
                  fontWeight: score === i ? 600 : 400,
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "var(--space-lg)" }}>
          <label htmlFor="nps-comment" style={{ display: "block", marginBottom: "var(--space-xs)", fontSize: "0.875rem", fontWeight: 500 }}>
            Optional comment
          </label>
          <textarea
            id="nps-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us more..."
            className="input"
            rows={3}
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleDismiss}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={score == null || submitting}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
