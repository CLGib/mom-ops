"use client";

import { useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { setOfferCookie, OFFER_FREE_TRIAL_VALUE } from "@/lib/offer-cookie";

/**
 * When the user lands on /free or with ?offer=free_trial, persist in a cookie
 * so after login/signup we can grant free trial credits on first member visit.
 */
export default function OfferCookieSetter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const offer = searchParams.get("offer");
    if (offer === OFFER_FREE_TRIAL_VALUE) {
      setOfferCookie(OFFER_FREE_TRIAL_VALUE);
    } else if (pathname === "/free" || pathname === "/freetask") {
      setOfferCookie(OFFER_FREE_TRIAL_VALUE);
    }
  }, [searchParams, pathname]);

  return null;
}
