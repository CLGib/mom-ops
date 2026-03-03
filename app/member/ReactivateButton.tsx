"use client";

import { useState } from "react";
import posthog from "posthog-js";

type Props = { className?: string; children?: React.ReactNode };

export default function ReactivateButton({
  className,
  children = "Reactivate subscription",
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    posthog.capture("reactivate_subscription_initiated");
    try {
      const res = await fetch("/api/stripe/checkout", {
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
      {loading ? "Redirecting…" : children}
    </button>
  );
}
