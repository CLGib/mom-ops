"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const COOKIE_NAME = "onboarding_skip";
const COOKIE_DAYS = 1;

function getSkipUntil(): number | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  const val = parseInt(match[1], 10);
  return Number.isNaN(val) ? null : val;
}

function setSkipCookie() {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setDate(expires.getDate() + COOKIE_DAYS);
  const expiryMs = expires.getTime();
  document.cookie = `${COOKIE_NAME}=${expiryMs}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

export default function OnboardingBanner() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const skipUntil = mounted ? getSkipUntil() : null;
  const now = mounted ? Date.now() : 0;
  const skipActive = skipUntil != null && now < skipUntil; // cookie stores expiry timestamp
  const show = mounted && !dismissed && !skipActive;

  function handleSkip() {
    setSkipCookie();
    setDismissed(true);
    router.refresh();
  }

  if (!show) return null;

  return (
    <div
      role="region"
      aria-label="Onboarding survey"
      style={{
        marginBottom: "var(--space-lg)",
        padding: "var(--space-md)",
        background: "var(--accent-soft-bg, #f8f5ed)",
        border: "1px solid var(--color-border, #e5e5e5)",
        borderRadius: "8px",
      }}
    >
      <p style={{ marginBottom: "var(--space-sm)", fontWeight: 500 }}>
        Want us to work faster for you? Take a 60-second setup survey (optional).
      </p>
      <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
        <Link href="/member/onboarding" className="btn btn-primary">
          Take survey
        </Link>
        <button type="button" onClick={handleSkip} className="btn">
          Skip for now
        </button>
      </div>
    </div>
  );
}
