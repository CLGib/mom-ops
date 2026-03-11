"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

/**
 * When Supabase redirects to the Site URL (/) with auth error params (e.g. email
 * change link expired), show a friendly message and link to login so the user
 * can try again from account settings.
 */
export default function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const errorCode = searchParams.get("error_code");
    const error = searchParams.get("error");
    const isOtpExpired =
      errorCode === "otp_expired" ||
      (error === "access_denied" && searchParams.get("error_description")?.toLowerCase().includes("expired"));

    if (isOtpExpired && !dismissed) {
      setMessage(
        "This email change link has expired or was already used. Sign in and try changing your email again from account settings."
      );
    }
  }, [searchParams, dismissed]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="auth-error-banner"
      style={{
        background: "var(--color-error-bg, #fef2f2)",
        border: "1px solid var(--color-error-border, #fecaca)",
        borderRadius: "var(--radius-md, 6px)",
        padding: "var(--space-md)",
        marginBottom: "var(--space-lg)",
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-sm)",
      }}
    >
      <p style={{ margin: 0, flex: 1 }}>
        {message}{" "}
        <Link href="/login" className="auth-error-banner-link" style={{ fontWeight: 600 }}>
          Sign in
        </Link>{" "}
        to try again from your account settings.
      </p>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          router.replace("/", { scroll: false });
        }}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0 var(--space-xs)",
          fontSize: "1.25rem",
          lineHeight: 1,
          opacity: 0.7,
        }}
      >
        ×
      </button>
    </div>
  );
}
