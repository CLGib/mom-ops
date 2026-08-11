"use client";

import { useState } from "react";

type Props = { slug: string; label: string };

export default function KitBuyButton({ slug, label }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout/kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error ?? "Couldn't start checkout. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleBuy}
        disabled={loading}
        className="btn btn-primary btn-large"
      >
        {loading ? "Starting checkout…" : label}
      </button>
      {error && (
        <p className="form-note" style={{ color: "var(--color-error, #b91c1c)", marginTop: "var(--space-sm)" }} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
