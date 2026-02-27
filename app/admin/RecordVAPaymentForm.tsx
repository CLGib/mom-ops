"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type VaOption = { id: string; email: string };

export default function RecordVAPaymentForm({ vas }: { vas: VaOption[] }) {
  const router = useRouter();
  const [vaId, setVaId] = useState("");
  const [amountDollars, setAmountDollars] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const dollars = parseFloat(amountDollars);
    if (Number.isNaN(dollars) || dollars <= 0) {
      setError("Amount must be a positive number (e.g. 25.50).");
      setLoading(false);
      return;
    }
    const amountCents = Math.round(dollars * 100);
    if (amountCents <= 0) {
      setError("Amount must be at least $0.01.");
      setLoading(false);
      return;
    }
    if (!vaId) {
      setError("Select a VA.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/va-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          vaId,
          amountCents,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to record payout.");
        setLoading(false);
        return;
      }
      setVaId("");
      setAmountDollars("");
      setNote("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (vas.length === 0) {
    return <p className="form-note">No VAs in the system yet.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="form-row" style={{ flexWrap: "wrap", gap: "var(--space-md)" }}>
      {error && (
        <p className="form-error" style={{ width: "100%" }} role="alert">
          {error}
        </p>
      )}
      <div className="form-group" style={{ minWidth: "12rem" }}>
        <label htmlFor="admin-va-payment-select">VA</label>
        <select
          id="admin-va-payment-select"
          value={vaId}
          onChange={(e) => setVaId(e.target.value)}
          required
          className="input"
        >
          <option value="">Select VA</option>
          {vas.map((va) => (
            <option key={va.id} value={va.id}>
              {va.email || va.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group" style={{ width: "8rem" }}>
        <label htmlFor="admin-va-payment-amount">Amount ($)</label>
        <input
          id="admin-va-payment-amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amountDollars}
          onChange={(e) => setAmountDollars(e.target.value)}
          required
          placeholder="e.g. 100.00"
          className="input"
        />
      </div>
      <div className="form-group" style={{ minWidth: "12rem", flex: 1 }}>
        <label htmlFor="admin-va-payment-note">Note (optional)</label>
        <input
          id="admin-va-payment-note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. PayPal ref"
          className="input"
        />
      </div>
      <div className="form-group" style={{ alignSelf: "flex-end" }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Recording…" : "Record payout"}
        </button>
      </div>
    </form>
  );
}
