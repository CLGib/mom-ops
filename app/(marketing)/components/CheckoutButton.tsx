"use client";

import { useState } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  priceType?: "default" | "founders";
};

export default function CheckoutButton({ children, className, priceType = "default" }: Props) {
  const [loading, setLoading] = useState(false);
  const isFounders = priceType === "founders";
  const endpoint = isFounders ? "/api/stripe/checkout/founders" : "/api/stripe/checkout";

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Checkout error", data);
        const msg =
          (data && typeof data.error === "string" && data.error) ||
          "Checkout failed. Check the console and server env (STRIPE_PRICE_ID, etc.).";
        alert(msg);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? "Loading…" : children}
    </button>
  );
}
