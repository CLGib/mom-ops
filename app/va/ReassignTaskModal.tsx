"use client";

import { useState, useEffect } from "react";

type VA = { id: string; display_name: string | null };

type Props = {
  ticketId: string;
  onSuccess: () => void;
  onClose: () => void;
};

export default function ReassignTaskModal({ ticketId, onSuccess, onClose }: Props) {
  const [vas, setVas] = useState<VA[]>([]);
  const [loadingPeers, setLoadingPeers] = useState(true);
  const [selectedVaId, setSelectedVaId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPeers(true);
      setError(null);
      try {
        const res = await fetch("/api/va/peers", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setError(data.error ?? "Could not load specialists");
          return;
        }
        if (!cancelled) setVas(data.vas ?? []);
      } catch {
        if (!cancelled) setError("Could not load specialists");
      } finally {
        if (!cancelled) setLoadingPeers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = !!selectedVaId && !submitting;
  const selectedVa = vas.find((v) => v.id === selectedVaId);
  const selectedLabel = selectedVa
    ? selectedVa.display_name || selectedVa.id.slice(0, 8)
    : "";

  async function handleConfirm() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/va/reassign-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ticket_id: ticketId,
          new_va_id: selectedVaId,
          note: note.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to reassign task");
        setSubmitting(false);
        return;
      }
      onClose();
      onSuccess();
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
      aria-labelledby="reassign-task-title"
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
        <h2 id="reassign-task-title" className="section-heading" style={{ marginTop: 0 }}>
          Assign task to another specialist
        </h2>
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          Choose a specialist who can take over this task. They’ll see it in their inbox and the thread will note the reassignment.
        </p>

        {loadingPeers ? (
          <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
            Loading specialists…
          </p>
        ) : vas.length === 0 ? (
          <p className="form-note" style={{ marginBottom: "var(--space-md)", color: "var(--color-error, #b91c1c)" }}>
            No other specialists available to assign.
          </p>
        ) : (
          <>
            <div className="form-group" style={{ marginBottom: "var(--space-sm)" }}>
              <label htmlFor="reassign-va">
                Specialist <span style={{ color: "var(--color-error, #b91c1c)" }}>*</span>
              </label>
              <select
                id="reassign-va"
                className="input select"
                value={selectedVaId}
                onChange={(e) => setSelectedVaId(e.target.value)}
                required
                aria-required="true"
                style={{ width: "100%" }}
              >
                <option value="">Select a specialist</option>
                {vas.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.display_name?.trim() || v.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
              <label htmlFor="reassign-note">Note (optional)</label>
              <textarea
                id="reassign-note"
                className="input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Reason or handoff context for the new specialist"
                rows={2}
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>
          </>
        )}

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
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!canSubmit || submitting}
          >
            {submitting ? "Reassigning…" : `Assign to ${selectedLabel || "specialist"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
