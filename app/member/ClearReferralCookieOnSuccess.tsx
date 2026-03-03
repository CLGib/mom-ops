"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { clearReferralCookie } from "@/lib/referral-cookie";

/**
 * After successful checkout, clear the referral cookie so it is not reused.
 */
export default function ClearReferralCookieOnSuccess() {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      clearReferralCookie();
    }
  }, [searchParams]);
  return null;
}
