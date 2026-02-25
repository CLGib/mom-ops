"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    const loginNext = isFounders ? "/founders?checkout=1" : "/?checkout=1";

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      fetch(endpoint, {
        method: "POST",
        credentials: "include",
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (res.status === 401) {
            window.location.href =
              "/login?next=" + encodeURIComponent(loginNext);
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
  }, [searchParams, pathname]);

  return null;
}
