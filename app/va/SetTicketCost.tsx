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
  const [tipAmount, setTipAmount] = useState(
    currentTipAmount != null && currentTipAmount > 0
      ? (currentTipAmount / 100).toFixed(2)
      : ""
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = createClient();
    await supabase
      .from("tickets")
      .update({
        credit_cost: creditCost ? parseInt(creditCost, 10) : null,
        tip_amount: tipAmount ? Math.round(parseFloat(tipAmount) * 100) : 0,
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
      <div className="form-group" style={{ width: "6rem" }}>
        <label htmlFor="tip-amount">Tip ($)</label>
        <input
          id="tip-amount"
          type="number"
          min="0"
          step="0.01"
          value={tipAmount}
          onChange={(e) => setTipAmount(e.target.value)}
          className="input"
        />
      </div>
      <button type="submit" className="btn btn-secondary">
        Set cost & tip
      </button>
    </form>
  );
}
