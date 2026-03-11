"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  messageId: string;
  ticketId: string;
};

export default function ApproveMessageButton({ messageId, ticketId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/approve-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message_id: messageId, ticket_id: ticketId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to approve");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-primary"
      style={{ fontSize: "0.85rem" }}
      onClick={handleApprove}
      disabled={loading}
    >
      {loading ? "Approving…" : "Approve & notify member"}
    </button>
  );
}
