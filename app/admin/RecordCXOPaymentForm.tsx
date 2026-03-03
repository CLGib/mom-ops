"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const BUCKET_LABELS: Record<string, string> = {
  five_star: "5 Star (review bonus)",
  nps_bonus: "NPS bonus",
  ceo_bonus: "CEO bonus",
  va_onboarded: "VA onboarded",
  ticket_pay: "Ticket pay",
  tips: "Tips",
};

type CxoOption = { id: string; email: string };

export default function RecordCXOPaymentForm({ cxos }: { cxos: CxoOption[] }) {
  const router = useRouter();
  const [directorId, setDirectorId] = useState("");
  const [bucket, setBucket] = useState("");
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
    if (!directorId) {
      setError("Select a CXO.");
      setLoading(false);
      return;
    }
    if (!bucket) {
      setError("Select a bucket.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/director-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          directorId,
          amountCents,
          bucket,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to record payout.");
        setLoading(false);
        return;
      }
      setDirectorId("");
      setBucket("");
      setAmountDollars("");
      setNote("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (cxos.length === 0) {
    return <p className="form-note">No CXOs in the system yet.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="form-row" style={{ flexWrap: "wrap", gap: "var(--space-md)" }}>
      {error && (
        <p className="form-error" style={{ width: "100%" }} role="alert">
          {error}
        </p>
      )}
      <div className="form-group" style={{ minWidth: "12rem" }}>
        <label htmlFor="admin-cxo-payment-select">CXO</label>
        <select
          id="admin-cxo-payment-select"
          value={directorId}
          onChange={(e) => setDirectorId(e.target.value)}
          required
          className="input"
        >
          <option value="">Select CXO</option>
          {cxos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.email || c.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group" style={{ minWidth: "14rem" }}>
        <label htmlFor="admin-cxo-payment-bucket">Bucket (source)</label>
        <select
          id="admin-cxo-payment-bucket"
          value={bucket}
          onChange={(e) => setBucket(e.target.value)}
          required
          className="input"
        >
          <option value="">Select bucket</option>
          {Object.entries(BUCKET_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <p className="form-note" style={{ marginTop: "var(--space-2xs)", marginBottom: 0 }}>
          Debits this amount from the CXO&apos;s balance for this bucket.
        </p>
      </div>
      <div className="form-group" style={{ width: "8rem" }}>
        <label htmlFor="admin-cxo-payment-amount">Amount ($)</label>
        <input
          id="admin-cxo-payment-amount"
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
        <label htmlFor="admin-cxo-payment-note">Note (optional)</label>
        <input
          id="admin-cxo-payment-note"
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
