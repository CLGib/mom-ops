"use client";

import { useState } from "react";

type PackageKey = "10" | "30" | "50";

type Props = {
  packageKey: PackageKey;
  label: string;
  price: string;
};

export default function CreditPackageButton({ packageKey, label, price }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout/credits", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: packageKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data.error as string) ?? "Checkout failed");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="token-card">
      <h4>{label}</h4>
      <p>{price}</p>
      {error && (
        <p className="form-error" role="alert" style={{ marginTop: "var(--space-sm)" }}>
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="btn btn-primary"
        style={{ marginTop: "var(--space-md)" }}
      >
        {loading ? "Loading…" : "Purchase"}
      </button>
    </div>
  );
}
