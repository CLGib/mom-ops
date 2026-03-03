"use client";

import { useEffect, useCallback } from "react";
import { useSetFoundersCount } from "./FoundersCountContext";

const POLL_MS = 20_000;

/**
 * Fetches founders count from API and updates FoundersCountContext.
 * Renders nothing; FoundersHero/FoundersCTA read claimed from context.
 */
export default function FoundersLiveCount() {
  const setClaimed = useSetFoundersCount();

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/founders/count", { cache: "no-store" });
      if (res.ok) {
        const { claimed: c } = await res.json();
        const n = typeof c === "number" ? Math.min(50, Math.max(0, c)) : 0;
        setClaimed(n);
      }
    } catch {
      // keep previous value
    }
  }, [setClaimed]);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, POLL_MS);
    return () => clearInterval(id);
  }, [fetchCount]);

  return null;
}
