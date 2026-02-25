"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

type Props = {
  ticketId: string;
  ticketSubject: string;
  senderId: string;
  senderRole: string;
};

export default function TicketThread({
  ticketId,
  ticketSubject,
  senderId,
  senderRole,
}: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!message.trim()) return;
    const supabase = createClient();
    const { data: inserted } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_id: senderId,
        sender_role: senderRole,
        message: message.trim(),
      })
      .select("id")
      .single();
    setMessage("");
    router.refresh();
    if (senderRole === "va" && inserted?.id) {
      fetch("/api/emails/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          template: "new_message_v1",
          payload: {
            message_id: inserted.id,
            ticket_id: ticketId,
            subject: ticketSubject,
          },
          dedupe_key: `new_message:${inserted.id}`,
        }),
      }).catch(() => {});
    }
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
