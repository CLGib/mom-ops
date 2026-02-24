"use client";

import { useEffect } from "react";

export default function CreditsAccordionTrigger() {
  useEffect(() => {
    function openDetailsFromHash() {
      const hash = window.location.hash;
      if (!hash || !hash.startsWith("#credits-accordion-")) return;
      const id = hash.slice(1);
      const el = document.getElementById(id);
      if (el && el.tagName === "DETAILS") {
        (el as HTMLDetailsElement).open = true;
      }
    }

    openDetailsFromHash();
    window.addEventListener("hashchange", openDetailsFromHash);
    return () => window.removeEventListener("hashchange", openDetailsFromHash);
  }, []);

  return null;
}
