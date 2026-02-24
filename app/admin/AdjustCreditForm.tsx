"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function AdjustCreditForm() {
  const router = useRouter();
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const amt = parseInt(amount, 10);
    if (Number.isNaN(amt) || amt === 0) {
      setError("Amount must be a non-zero integer.");
      return;
    }
    const supabase = createClient();
    const { error: err } = await supabase.from("credit_transactions").insert({
      member_id: memberId.trim(),
      amount: amt,
      type: "admin_adjustment",
    });
    if (err) {
      setError(err.message);
      return;
    }
    setMemberId("");
    setAmount("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="form-row">
      {error && (
        <p className="form-error" style={{ width: "100%" }} role="alert">
          {error}
        </p>
      )}
      <div className="form-group" style={{ width: "18rem" }}>
        <label htmlFor="admin-member-id">Member ID (uuid)</label>
        <input
          id="admin-member-id"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          required
          placeholder="uuid"
          className="input"
        />
      </div>
      <div className="form-group" style={{ width: "8rem" }}>
        <label htmlFor="admin-amount">Amount (+ or -)</label>
        <input
          id="admin-amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder="e.g. 1000 or -500"
          className="input"
        />
      </div>
      <button type="submit" className="btn btn-primary">
        Apply
      </button>
    </form>
  );
}
