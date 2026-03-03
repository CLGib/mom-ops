"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const STATUSES = [
  "assigned",
  "awaiting_member_approval",
  "in_progress",
  "waiting_on_member",
  "completed",
  "closed",
  "cancelled_by_va",
  "cancelled_by_admin",
] as const;

const FINAL_STATUSES = ["completed", "closed"] as const;

type Props = { ticketId: string; currentStatus: string };

export default function UpdateTicketStatus({ ticketId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

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
    } else {
      setSavedMessage("Saved.");
    }
    setTimeout(() => setSavedMessage(null), 3000);
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    const isFinal = FINAL_STATUSES.includes(newStatus as (typeof FINAL_STATUSES)[number]);
    const wasOpen = status !== "completed" && status !== "closed";
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
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {saving && <span className="form-note" style={{ margin: 0 }}>Saving…</span>}
      {savedMessage && !saving && (
        <span className="form-note" style={{ margin: 0, color: "var(--color-success, #15803d)" }} role="status">
          {savedMessage}
        </span>
      )}
      {pendingStatus && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", flexWrap: "wrap" }}>
          <span className="form-note" style={{ margin: 0 }}>
            Mark as {pendingStatus}? This will finalize the task and charge the member&apos;s credits.
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
