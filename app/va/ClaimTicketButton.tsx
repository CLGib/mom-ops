"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = { ticketId: string; subject?: string };

export default function ClaimTicketButton({ ticketId, subject = "" }: Props) {
  const router = useRouter();

  async function handleClaim() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("tickets")
      .update({ assigned_va_id: user.id, status: "assigned" })
      .eq("id", ticketId);
    if (error) {
      router.refresh();
      return;
    }
    try {
      await fetch("/api/emails/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          template: "va_claimed_v1",
          payload: { ticket_id: ticketId, subject },
          dedupe_key: `va_claimed:${ticketId}`,
        }),
      });
    } catch {
      // best-effort; email will be missed but claim succeeded
    }
    router.refresh();
  }

  return (
    <button type="button" onClick={handleClaim} className="btn btn-primary">
      Claim
    </button>
  );
}
