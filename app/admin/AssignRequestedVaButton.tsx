"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = { ticketId: string; requestedVaId: string };

export default function AssignRequestedVaButton({ ticketId, requestedVaId }: Props) {
  const router = useRouter();

  async function handleAssign() {
    const supabase = createClient();
    const { error } = await supabase
      .from("tickets")
      .update({ assigned_va_id: requestedVaId, status: "assigned" })
      .eq("id", ticketId);
    if (error) return;
    router.refresh();
  }

  return (
    <button type="button" onClick={handleAssign} className="btn btn-secondary">
      Assign requested VA
    </button>
  );
}
