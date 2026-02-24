"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

type Props = {
  ticketId: string;
  senderId: string;
  senderRole: string;
};

export default function TicketThread({
  ticketId,
  senderId,
  senderRole,
}: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!message.trim()) return;
    const supabase = createClient();
    await supabase.from("ticket_messages").insert({
      ticket_id: ticketId,
      sender_id: senderId,
      sender_role: senderRole,
      message: message.trim(),
    });
    setMessage("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", gap: "var(--space-sm)", alignItems: "flex-end" }}
    >
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Add a message…"
        className="input"
        style={{ flex: 1 }}
      />
      <button type="submit" className="btn btn-primary">
        Send
      </button>
    </form>
  );
}
