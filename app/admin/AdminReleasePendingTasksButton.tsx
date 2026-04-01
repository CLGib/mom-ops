"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { pendingCount: number };

export default function AdminReleasePendingTasksButton({ pendingCount }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRelease() {
    if (pendingCount === 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/release-pending-tasks", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? `Request failed (${res.status})`);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  if (pendingCount === 0) return null;

  return (
    <section style={{ marginBottom: "var(--space-2xl)" }}>
      <h2 className="section-heading">Release pending tasks</h2>
      <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
        {pendingCount} task{pendingCount !== 1 ? "s" : ""} currently assigned. Release them so any specialist can claim
        again.
      </p>
      <button
        type="button"
        onClick={handleRelease}
        className="btn btn-secondary"
        disabled={loading}
      >
        {loading ? "Releasing…" : "Release all pending tasks"}
      </button>
      {error && (
        <p className="form-note" style={{ marginTop: "var(--space-sm)", color: "var(--color-error, #c00)" }}>
          {error}
        </p>
      )}
    </section>
  );
}
