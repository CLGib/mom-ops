"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CheckoutRedirect() {
  const searchParams = useSearchParams();
  const didRun = useRef(false);

  useEffect(() => {
    if (searchParams.get("checkout") !== "1") return;
    if (didRun.current) return;
    didRun.current = true;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      fetch("/api/stripe/checkout", {
        method: "POST",
        credentials: "include",
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (res.status === 401) {
            window.location.href =
              "/login?next=" + encodeURIComponent("/?checkout=1");
            return;
          }
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
    });
  }, [searchParams]);

  return null;
}
