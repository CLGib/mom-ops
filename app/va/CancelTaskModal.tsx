"use client";

import { useState } from "react";

const CANCELLATION_REASONS = [
  { value: "customer_request", label: "Customer Request" },
  { value: "medical_emergency", label: "Medical / Emergency" },
  { value: "personal_emergency", label: "Personal Emergency" },
  { value: "scope_outside_skillset", label: "Scope Outside Skillset" },
  { value: "duplicate_task", label: "Duplicate Task" },
  { value: "incomplete_details", label: "Incomplete Task Details" },
  { value: "system_technical", label: "System / Technical Issue" },
  { value: "other", label: "Other (requires written explanation)" },
] as const;

type Props = {
  ticketId: string;
  onSuccess: () => void;
  onClose: () => void;
};

export default function CancelTaskModal({ ticketId, onSuccess, onClose }: Props) {
  const [reason, setReason] = useState<string>("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [otherExplanation, setOtherExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOther = reason === "other";
  const canSubmit =
    reason &&
    (reason !== "other" || otherExplanation.trim().length > 0);

  async function handleConfirm() {
    if (!canSubmit || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/va/cancel-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ticket_id: ticketId,
          reason,
          additional_notes: additionalNotes.trim() || null,
          other_explanation: isOther ? otherExplanation.trim() || null : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to cancel task");
        setSubmitting(false);
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-task-title"
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        style={{
          maxWidth: "28rem",
          width: "100%",
          margin: "var(--space-md)",
          padding: "var(--space-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="cancel-task-title" className="section-heading" style={{ marginTop: 0 }}>
          Cancel Task
        </h2>
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          Please select a reason for canceling this task. This will notify the member.
        </p>

        <div className="form-group" style={{ marginBottom: "var(--space-sm)" }}>
          <label htmlFor="cancel-reason">
            Reason <span style={{ color: "var(--color-error, #b91c1c)" }}>*</span>
          </label>
          <select
            id="cancel-reason"
            className="input select"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            aria-required="true"
            style={{ width: "100%" }}
          >
            <option value="">Select a reason</option>
            {CANCELLATION_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {isOther && (
          <div className="form-group" style={{ marginBottom: "var(--space-sm)" }}>
            <label htmlFor="cancel-other">
              Explanation <span style={{ color: "var(--color-error, #b91c1c)" }}>*</span>
            </label>
            <input
              id="cancel-other"
              type="text"
              className="input"
              value={otherExplanation}
              onChange={(e) => setOtherExplanation(e.target.value)}
              placeholder="Please explain"
              required
              aria-required="true"
              style={{ width: "100%" }}
            />
          </div>
        )}

        <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
          <label htmlFor="cancel-notes">Additional notes (optional)</label>
          <textarea
            id="cancel-notes"
            className="input"
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Any additional context for the member or team"
            rows={3}
            style={{ width: "100%", resize: "vertical" }}
          />
        </div>

        {error && (
          <p role="alert" style={{ color: "var(--color-error, #b91c1c)", marginBottom: "var(--space-sm)", fontSize: "0.875rem" }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Back
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!canSubmit || submitting}
          >
            {submitting ? "Canceling…" : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}
