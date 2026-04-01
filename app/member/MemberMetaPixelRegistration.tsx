"use client";

import { useEffect } from "react";
import { trackMetaPixelEvent } from "@/lib/meta-pixel";

const STORAGE_KEY = "meta_complete_registration_sent";

export default function MemberMetaPixelRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    trackMetaPixelEvent("CompleteRegistration");
    sessionStorage.setItem(STORAGE_KEY, "1");
  }, []);
  return null;
}
