"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdjustCreditForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const amt = parseInt(amount, 10);
    if (Number.isNaN(amt) || amt === 0) {
      setError("Amount must be a non-zero integer.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/credits-by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), amount: amt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to adjust credits.");
        setLoading(false);
        return;
      }
      setEmail("");
      setAmount("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-row">
      {error && (
        <p className="form-error" style={{ width: "100%" }} role="alert">
          {error}
        </p>
      )}
      <div className="form-group" style={{ width: "20rem" }}>
        <label htmlFor="admin-email">Member email</label>
        <input
          id="admin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="member@example.com"
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
          placeholder="e.g. 100 or -50"
          className="input"
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Applying…" : "Apply"}
      </button>
    </form>
  );
}
