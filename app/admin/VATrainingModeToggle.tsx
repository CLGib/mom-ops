"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  vaId: string;
  workRequiresReview: boolean;
};

export default function VATrainingModeToggle({ vaId, workRequiresReview: initial }: Props) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    const next = !on;
    try {
      const res = await fetch("/api/admin/va-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ vaId, work_requires_review: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to update");
        return;
      }
      setOn(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <label style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", cursor: loading ? "wait" : "pointer", fontSize: "0.875rem" }}>
      <input
        type="checkbox"
        checked={on}
        onChange={handleToggle}
        disabled={loading}
        aria-label={on ? "Training mode on (work requires review)" : "Full access (work goes live)"}
      />
      <span title={on ? "VA is in training: messages need approval before member sees them" : "VA has full access: messages go live immediately"}>
        {on ? "Training" : "Full access"}
      </span>
    </label>
  );
}
