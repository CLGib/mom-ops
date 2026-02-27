"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { vaId: string; email: string };

export default function DeleteVAButton({ vaId, email }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/delete-va", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ vaId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Failed to delete VA account.");
        return;
      }
      router.refresh();
    } catch {
      alert("Something went wrong.");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
        <span className="form-note">Delete {email}?</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="btn btn-secondary"
          style={{ color: "var(--color-error, #c00)" }}
        >
          {loading ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="btn btn-secondary"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="btn btn-secondary"
      style={{ color: "var(--color-error, #c00)" }}
    >
      Delete account
    </button>
  );
}
