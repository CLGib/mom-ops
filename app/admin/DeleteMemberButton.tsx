"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  memberId: string;
  memberName: string;
};

export default function DeleteMemberButton({ memberId, memberName }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const displayName = memberName || "This member";
    if (!confirm(`Permanently delete ${displayName}? They will lose access and their account data will be removed. This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/delete-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Failed to delete member");
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
