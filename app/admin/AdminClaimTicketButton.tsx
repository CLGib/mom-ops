"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = { ticketId: string };

export default function AdminClaimTicketButton({ ticketId }: Props) {
  const router = useRouter();

  async function handleClaim() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("tickets")
      .update({ assigned_va_id: user.id, status: "assigned" })
      .eq("id", ticketId);
    router.refresh();
  }

  return (
    <button type="button" onClick={handleClaim} className="btn btn-primary">
      Claim
    </button>
  );
}
