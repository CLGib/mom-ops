"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getOfferCookie, clearOfferCookie, OFFER_FREE_TRIAL_VALUE } from "@/lib/offer-cookie";

/**
 * When the member has the free_trial offer cookie and lands on /member,
 * call the activate API once, then clear the cookie. Idempotent on the server.
 */
export default function FreeTrialActivator() {
  const router = useRouter();
  const didRun = useRef(false);

  useEffect(() => {
    if (getOfferCookie() !== OFFER_FREE_TRIAL_VALUE) return;
    if (didRun.current) return;
    didRun.current = true;

    fetch("/api/member/free-trial-activate", {
      method: "POST",
      credentials: "include",
    })
      .then((res) => {
        if (res.ok) {
          clearOfferCookie();
          router.refresh();
        }
      })
      .catch(() => {});
  }, [router]);

  return null;
}
