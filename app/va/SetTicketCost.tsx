"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

type Props = {
  ticketId: string;
  currentCreditCost: number | null;
  currentTipAmount: number | null;
};

export default function SetTicketCost({
  ticketId,
  currentCreditCost,
  currentTipAmount,
}: Props) {
  const router = useRouter();
  const [creditCost, setCreditCost] = useState(
    currentCreditCost != null ? String(currentCreditCost) : ""
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = createClient();
    await supabase
      .from("tickets")
      .update({
        credit_cost: creditCost ? parseInt(creditCost, 10) : null,
      })
      .eq("id", ticketId);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="form-row">
      <div className="form-group" style={{ width: "6rem" }}>
        <label htmlFor="credit-cost">Credit cost</label>
        <input
          id="credit-cost"
          type="number"
          min="0"
          value={creditCost}
          onChange={(e) => setCreditCost(e.target.value)}
          className="input"
        />
      </div>
      {currentTipAmount != null && currentTipAmount > 0 && (
        <div className="form-group" style={{ marginLeft: "var(--space-sm)" }}>
          <span className="form-note">Tip: ${(currentTipAmount / 100).toFixed(2)} (set by member)</span>
        </div>
      )}
      <button type="submit" className="btn btn-secondary">
        Set cost
      </button>
    </form>
  );
}
