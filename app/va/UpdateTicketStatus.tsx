"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const STATUSES = [
  "assigned",
  "awaiting_member_approval",
  "in_progress",
  "waiting_on_member",
  "completed",
  "closed",
] as const;

type Props = { ticketId: string; currentStatus: string };

export default function UpdateTicketStatus({ ticketId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    const supabase = createClient();
    await supabase.from("tickets").update({ status: newStatus }).eq("id", ticketId);
    setStatus(newStatus);
    router.refresh();
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      className="input select"
      style={{ width: "auto", minWidth: "11rem" }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
