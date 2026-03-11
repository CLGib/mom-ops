"use client";

import { useState } from "react";
import posthog from "posthog-js";

type Props = {
  className?: string;
  children?: React.ReactNode;
  isFoundingMember?: boolean;
};

export default function ReactivateButton({
  className,
  children,
  isFoundingMember = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const label = children ?? (isFoundingMember ? "Reactivate at founder price ($15.95/month)" : "Reactivate subscription");

  async function handleClick() {
    setLoading(true);
    posthog.capture("reactivate_subscription_initiated", { is_founding_member: isFoundingMember });
    try {
      const endpoint = isFoundingMember ? "/api/stripe/checkout/founders" : "/api/stripe/checkout";
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href =
          "/login?next=" + encodeURIComponent("/member");
        return;
      }
      if (!res.ok) {
        const msg =
          (data && typeof data.error === "string" && data.error) ||
          "Checkout failed. Try again or contact support.";
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
      className={className ?? "btn btn-primary"}
    >
      {loading ? "Redirecting…" : label}
    </button>
  );
}
