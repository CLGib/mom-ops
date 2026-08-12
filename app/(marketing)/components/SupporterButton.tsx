"use client";

import { useState } from "react";

type Props = { className?: string; label?: string };

export default function SupporterButton({ className, label }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout/supporter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: "{}",
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
        onClick={handleClick}
        disabled={loading}
        className={className ?? "btn btn-primary btn-large"}
      >
        {loading ? "Starting…" : label ?? "Become a Regular · $9.95/mo"}
      </button>
      {error && (
        <p className="form-note" style={{ color: "var(--color-error, #b91c1c)", marginTop: "var(--space-sm)" }} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
