"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to tickets table: when a ticket is inserted or updated and becomes
 * unassigned with status new/reopened, refreshes the VA tasks page so "Claim more tasks"
 * shows the new ticket (e.g. when a member requests a task).
 */
export default function RealtimeUnassignedTickets() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    function isUnassignedClaimable(row: { status?: string | null; assigned_va_id?: string | null } | null | undefined) {
      if (!row) return false;
      const status = row.status ?? "";
      const unassigned = row.assigned_va_id == null;
      return unassigned && (status === "new" || status === "reopened");
    }

    const channel = supabase
      .channel("va-unassigned-tickets")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tickets",
        },
        (payload: { new?: { status?: string; assigned_va_id?: string | null } }) => {
          if (isUnassignedClaimable(payload.new)) {
            router.refresh();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
        },
        (payload: { new?: { status?: string; assigned_va_id?: string | null } }) => {
          if (isUnassignedClaimable(payload.new)) {
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
