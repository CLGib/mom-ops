"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { getReferralCode } from "@/lib/referral-cookie";

export default function CheckoutRedirect() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const didRun = useRef(false);

  useEffect(() => {
    if (searchParams.get("checkout") !== "1") return;
    if (didRun.current) return;
    didRun.current = true;

    const isFounders = pathname === "/founders";
    const endpoint = isFounders ? "/api/stripe/checkout/founders" : "/api/stripe/checkout";
    const referralCode = getReferralCode();
    const body = referralCode ? JSON.stringify({ referral_code: referralCode }) : undefined;

    fetch(endpoint, {
      method: "POST",
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            (data && typeof data.error === "string" && data.error) ||
            "Checkout failed. Check server env (STRIPE_PRICE_ID, etc.).";
          alert(msg);
          return;
        }
        if (data?.url) {
          window.location.href = data.url;
        }
      });
  }, [searchParams, pathname]);

  return null;
}
