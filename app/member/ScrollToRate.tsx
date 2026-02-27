"use client";

import { useEffect } from "react";

export default function ScrollToRate() {
  useEffect(() => {
    const el = document.getElementById("rate");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);
  return null;
}
