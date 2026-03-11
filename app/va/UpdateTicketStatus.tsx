"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import confetti from "canvas-confetti";
import {
  getStatusLabel,
  FINAL_STATUSES,
  STATUS_GROUP_ACTIVE,
  STATUS_GROUP_DONE,
  STATUS_GROUP_CANCELLED,
} from "@/lib/ticket-status";

type Props = { ticketId: string; currentStatus: string; vaOnly?: boolean; creditCost?: number | null };

export default function UpdateTicketStatus({ ticketId, currentStatus, vaOnly = false, creditCost }: Props) {
  const vaCannotClose = vaOnly && (creditCost == null || creditCost === undefined);
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const cancelledSlugs = vaOnly ? (["cancelled_by_va"] as const) : ([...STATUS_GROUP_CANCELLED] as const);

  async function applyStatus(newStatus: string) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("tickets").update({ status: newStatus }).eq("id", ticketId);
    setSaving(false);
    setPendingStatus(null);
    if (error) {
      setSavedMessage("Failed to save.");
      setTimeout(() => setSavedMessage(null), 3000);
      return;
    }
    setStatus(newStatus);
    router.refresh();
    if (FINAL_STATUSES.includes(newStatus as (typeof FINAL_STATUSES)[number])) {
      setSavedMessage("Saved. Member has been charged.");
      // Celebrate when VA closes/completes a ticket
      const duration = 2_000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899"],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    } else {
      setSavedMessage("Saved.");
    }
    setTimeout(() => setSavedMessage(null), 3000);
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    const isFinal = FINAL_STATUSES.includes(newStatus as (typeof FINAL_STATUSES)[number]);
    const wasOpen = status !== "completed" && status !== "closed";
    if (vaCannotClose && isFinal) {
      // Don't allow selecting completed/closed when cost not set; keep current selection
      return;
    }
    if (isFinal && wasOpen) {
      setPendingStatus(newStatus);
      return;
    }
    applyStatus(newStatus);
  }

  function confirmClose() {
    if (pendingStatus) {
      applyStatus(pendingStatus);
    }
  }

  function cancelClose() {
    setPendingStatus(null);
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)" }}>
      <select
        value={pendingStatus ?? status}
        onChange={handleChange}
        className="input select"
        style={{ width: "auto", minWidth: "11rem" }}
        disabled={saving}
      >
        <optgroup label="Active">
          {STATUS_GROUP_ACTIVE.map((s) => (
            <option key={s} value={s}>
              {getStatusLabel(s)}
            </option>
          ))}
        </optgroup>
        <optgroup label="Done">
          {STATUS_GROUP_DONE.map((s) => (
            <option key={s} value={s} disabled={vaCannotClose}>
              {getStatusLabel(s)}
            </option>
          ))}
        </optgroup>
        <optgroup label="Cancelled">
          {cancelledSlugs.map((s) => (
            <option key={s} value={s}>
              {getStatusLabel(s)}
            </option>
          ))}
        </optgroup>
      </select>
      {saving && <span className="form-note" style={{ margin: 0 }}>Saving…</span>}
      {savedMessage && !saving && (
        <span className="form-note" style={{ margin: 0, color: "var(--color-success, #15803d)" }} role="status">
          {savedMessage}
        </span>
      )}
      {vaCannotClose && (
        <span className="form-note" style={{ margin: 0, color: "var(--color-warning, #b45309)" }}>
          Set credit cost above before closing or completing this task.
        </span>
      )}
      {pendingStatus && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", flexWrap: "wrap" }}>
          <span className="form-note" style={{ margin: 0 }}>
            Mark as {getStatusLabel(pendingStatus)}? This will finalize the task and charge the member&apos;s credits.
          </span>
          <button type="button" className="btn btn-primary" onClick={confirmClose} disabled={saving}>
            Save
          </button>
          <button type="button" className="btn btn-secondary" onClick={cancelClose} disabled={saving}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
