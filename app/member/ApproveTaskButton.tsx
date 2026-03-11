"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveTask } from "./actions";

type Props = { ticketId: string };

export default function ApproveTaskButton({ ticketId }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setError(null);
    setSubmitting(true);
    const result = await approveTask(ticketId);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ marginBottom: "var(--space-lg)" }}>
      <button
        type="button"
        onClick={handleApprove}
        disabled={submitting}
        className="btn btn-primary"
      >
        {submitting ? "Approving…" : "Approve task"}
      </button>
      {error && (
        <p className="form-note" style={{ color: "var(--color-error, #b91c1c)", marginTop: "var(--space-sm)" }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
