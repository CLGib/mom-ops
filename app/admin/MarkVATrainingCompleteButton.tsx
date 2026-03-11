"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  vaId: string;
  trainingComplete: boolean;
};

export default function MarkVATrainingCompleteButton({ vaId, trainingComplete }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleMarkComplete() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/va-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ vaId, training_complete: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to update");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (trainingComplete) {
    return (
      <span className="form-note" style={{ fontSize: "0.8rem", margin: 0 }} title="VA can see /va/tasks and claim tasks">
        Can claim tasks ✓
      </span>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-secondary"
      style={{ fontSize: "0.85rem" }}
      onClick={handleMarkComplete}
      disabled={loading}
      title="Allow this VA to see /va/tasks and claim tasks without completing training"
    >
      {loading ? "Updating…" : "Allow claim tasks"}
    </button>
  );
}
