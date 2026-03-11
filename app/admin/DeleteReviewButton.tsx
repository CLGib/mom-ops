"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  reviewId: string;
};

export default function DeleteReviewButton({ reviewId }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this review? The rating and feedback will be removed from the task. This cannot be undone.")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/delete-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reviewId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Failed to delete review");
        return;
      }
      router.refresh();
    } catch {
      alert("Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="btn btn-secondary"
      style={{ fontSize: "0.875rem", color: "var(--color-error, #c00)" }}
    >
      {deleting ? "Deleting…" : "Delete"}
    </button>
  );
}
