"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const COST_CATEGORY_LABELS: Record<string, string> = {
  va_cost: "VA Cost",
  tips_payout: "Tips Payout",
  drins_pay: "Drin's Pay",
  bonus: "Bonus",
  software: "Software & Tools",
  other: "Other",
  refund: "Refund",
  stripe_fees: "Stripe Fees",
};

export default function CfoExpensesUpload() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [notes, setNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim() || Number.isNaN(amt) || amt < 0) {
      setMessage({ type: "err", text: "Name and amount (≥ 0) are required." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("amount", String(amt));
      form.append("category", category);
      form.append("month", month);
      if (notes.trim()) form.append("notes", notes.trim());
      form.append("is_paid", "false");
      if (imageFile) form.append("image", imageFile);
      const res = await fetch("/api/admin/revenue/costs", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Failed to add cost" });
        return;
      }
      setMessage({ type: "ok", text: "Cost entry added." });
      setName("");
      setAmount("");
      setNotes("");
      setImageFile(null);
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "Failed to add cost" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="cfo-exp-name">Name</label>
        <input id="cfo-exp-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="cfo-exp-amount">Amount ($)</label>
        <input id="cfo-exp-amount" type="number" step="0.01" min="0" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="cfo-exp-category">Category</label>
        <select id="cfo-exp-category" className="input select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {Object.entries(COST_CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="cfo-exp-month">Month (optional)</label>
        <input id="cfo-exp-month" type="month" className="input" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: "auto" }} />
      </div>
      <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="cfo-exp-notes">Notes (optional)</label>
        <input id="cfo-exp-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="cfo-exp-image">Image / receipt (optional)</label>
        <input id="cfo-exp-image" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
        {imageFile && <span className="form-note">{imageFile.name}</span>}
      </div>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Saving…" : "Add cost"}
      </button>
      {message && (
        <p role="alert" style={{ marginTop: "var(--space-sm)", color: message.type === "err" ? "var(--color-error, #b91c1c)" : undefined }}>
          {message.text}
        </p>
      )}
    </form>
  );
}
