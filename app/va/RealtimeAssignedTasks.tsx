"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = { assignedTicketIds: string[] };

/**
 * Subscribes to new messages on any of the VA's assigned tasks. When a message is inserted,
 * refreshes the dashboard so the VA sees updated task list / knows what needs attention.
 */
export default function RealtimeAssignedTasks({ assignedTicketIds }: Props) {
  const router = useRouter();
  const ticketIdsKey = assignedTicketIds.join(",");

  useEffect(() => {
    const idSet = new Set(assignedTicketIds);
    if (idSet.size === 0) return;

    const supabase = createClient();
    const channel = supabase
      .channel("va-assigned-ticket-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
        },
        (payload: { new?: { ticket_id?: string } }) => {
          const ticketId = payload.new?.ticket_id;
          if (ticketId && idSet.has(ticketId)) {
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketIdsKey, assignedTicketIds, router]);

  return null;
}
