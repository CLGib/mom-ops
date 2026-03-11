"use client";

import { useState } from "react";
import { getReferralCode } from "@/lib/referral-cookie";
import posthog from "posthog-js";
import { trackMetaPixelEvent } from "@/lib/meta-pixel";

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
    posthog.capture("checkout_initiated", {
      price_type: priceType,
      has_referral: !!getReferralCode(),
    });
      trackMetaPixelEvent("InitiateCheckout", {
        content_name: isFounders ? "founders" : "default",
        currency: "USD",
      });
    try {
      const referralCode = getReferralCode();
      const body = referralCode ? { referral_code: referralCode } : {};
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: Object.keys(body).length ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Checkout error", data);
        const msg =
          (data && typeof data.error === "string" && data.error) ||
          `Checkout failed. Check the console and server env (${isFounders ? "STRIPE_FOUNDERS_PRICE_ID" : "STRIPE_PRICE_ID"}, etc.).`;
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
