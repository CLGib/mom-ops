"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { setReferralCookie } from "@/lib/referral-cookie";

/**
 * When the user lands with ?ref=<referrer_user_id>, persist it in a cookie
 * so checkout (after login/signup) can attach the referral to the session.
 */
export default function ReferralCookieSetter() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setReferralCookie(ref);
  }, [searchParams]);
  return null;
}
