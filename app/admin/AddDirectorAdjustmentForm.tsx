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

export default function AddDirectorAdjustmentForm({ cxos }: { cxos: CxoOption[] }) {
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
      setError("Amount must be a positive number.");
      setLoading(false);
      return;
    }
    const amountCents = Math.round(dollars * 100);
    if (!directorId || !bucket) {
      setError("Select CXO and bucket.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/director-adjustment", {
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
        setError(data.error ?? "Failed to add credit.");
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

  if (cxos.length === 0) return null;

  return (
    <form onSubmit={handleSubmit} className="form-row" style={{ flexWrap: "wrap", gap: "var(--space-md)" }}>
      {error && (
        <p className="form-error" style={{ width: "100%" }} role="alert">{error}</p>
      )}
      <div className="form-group" style={{ minWidth: "12rem" }}>
        <label htmlFor="admin-cxo-adj-select">CXO</label>
        <select id="admin-cxo-adj-select" value={directorId} onChange={(e) => setDirectorId(e.target.value)} required className="input">
          <option value="">Select CXO</option>
          {cxos.map((c) => (
            <option key={c.id} value={c.id}>{c.email || c.id.slice(0, 8)}</option>
          ))}
        </select>
      </div>
      <div className="form-group" style={{ minWidth: "14rem" }}>
        <label htmlFor="admin-cxo-adj-bucket">Bucket</label>
        <select id="admin-cxo-adj-bucket" value={bucket} onChange={(e) => setBucket(e.target.value)} required className="input">
          <option value="">Select bucket</option>
          {Object.entries(BUCKET_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div className="form-group" style={{ width: "8rem" }}>
        <label htmlFor="admin-cxo-adj-amount">Amount ($)</label>
        <input id="admin-cxo-adj-amount" type="number" step="0.01" min="0.01" value={amountDollars} onChange={(e) => setAmountDollars(e.target.value)} required placeholder="e.g. 25.00" className="input" />
      </div>
      <div className="form-group" style={{ minWidth: "12rem", flex: 1 }}>
        <label htmlFor="admin-cxo-adj-note">Note (optional)</label>
        <input id="admin-cxo-adj-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 5-star reviews for Feb" className="input" />
      </div>
      <div className="form-group" style={{ alignSelf: "flex-end" }}>
        <button type="submit" className="btn btn-secondary" disabled={loading}>
          {loading ? "Adding…" : "Add credit"}
        </button>
      </div>
    </form>
  );
}
