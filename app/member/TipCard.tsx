"use client";

import { useState } from "react";

const MIN_DOLLARS = 1;
const MAX_DOLLARS = 25;

type Preset = 1 | 3 | "custom";

export default function TipCard({ taskId }: { taskId: string }) {
  const [selected, setSelected] = useState<Preset | null>(null);
  const [customValue, setCustomValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getAmountCents(): number | null {
    if (selected === 1) return 100;
    if (selected === 3) return 300;
    if (selected === "custom") {
      const parsed = parseFloat(customValue);
      if (Number.isNaN(parsed) || parsed < MIN_DOLLARS || parsed > MAX_DOLLARS) return null;
      return Math.round(parsed * 100);
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = getAmountCents();
    if (cents == null) {
      setError(selected === "custom" ? `Enter an amount between $${MIN_DOLLARS} and $${MAX_DOLLARS}` : "Choose an amount");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, amount_cents: cents }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }
      if (data.url) window.location.href = data.url;
      else setError("Something went wrong");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className="card"
      style={{ marginBottom: "var(--space-lg)" }}
      aria-label="Optional tip"
    >
      <h2 className="section-heading">Buy your VA a coffee ☕</h2>
      <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
        If this task made your day easier, you can leave a small tip. Totally optional. No pressure.
      </p>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
          {([1, 3] as const).map((d) => (
            <button
              key={d}
              type="button"
              className="button"
              style={{
                minWidth: 80,
                background: selected === d ? "var(--accent-soft-bg)" : "var(--surface)",
                color: selected === d ? "var(--accent)" : "var(--text)",
                border: `2px solid ${selected === d ? "var(--accent)" : "var(--border)"}`,
              }}
              onClick={() => {
                setSelected(d);
                setCustomValue("");
                setError(null);
              }}
            >
              ${d}
            </button>
          ))}
          <button
            type="button"
            className="button"
            style={{
              minWidth: 80,
              background: selected === "custom" ? "var(--accent-soft-bg)" : "var(--surface)",
              color: selected === "custom" ? "var(--accent)" : "var(--text)",
              border: `2px solid ${selected === "custom" ? "var(--accent)" : "var(--border)"}`,
            }}
            onClick={() => {
              setSelected("custom");
              setError(null);
            }}
          >
            Custom
          </button>
        </div>
        {selected === "custom" && (
          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="tip-custom" className="form-label">
              Amount (USD)
            </label>
            <input
              id="tip-custom"
              type="number"
              min={MIN_DOLLARS}
              max={MAX_DOLLARS}
              step="0.01"
              placeholder="1.00 – 25.00"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              className="form-input"
              style={{ maxWidth: 160 }}
            />
          </div>
        )}
        {error && (
          <p className="form-note" style={{ color: "var(--error, #b91c1c)", marginBottom: "var(--space-sm)" }}>
            {error}
          </p>
        )}
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          Tips go directly to your Mom Ops Specialist.
        </p>
        <button
          type="submit"
          className="button"
          disabled={loading || getAmountCents() == null}
          style={{
            background: "var(--accent)",
            color: "var(--surface)",
            border: "none",
          }}
        >
          {loading ? "Taking you to checkout…" : "Send tip"}
        </button>
      </form>
    </section>
  );
}
