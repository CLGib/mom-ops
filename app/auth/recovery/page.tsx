"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Handles auth redirects where Supabase put tokens in the URL hash (e.g. password
 * recovery). The hash is not sent to the server, so we run here in the browser,
 * set the session from the hash, then redirect to the intended page (e.g. /reset-password).
 */
export default function AuthRecoveryPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (!hash) {
      setError("No recovery data in URL. The link may have expired.");
      return;
    }

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setError("Invalid recovery link. Request a new password reset from the login page.");
      return;
    }

    // Only redirect to the reset-password page (allowlist to prevent open redirect)
    const allowedRedirect = "/reset-password";

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(() => {
        // Clear the hash from the URL so the tokens aren’t visible, then redirect
        window.location.replace(allowedRedirect);
      })
      .catch((err: unknown) => {
        console.warn("[auth/recovery] setSession:", err);
        const message = err instanceof Error ? err.message : "Something went wrong. Try requesting a new reset link.";
        setError(message);
      });
  }, []);

  if (error) {
    return (
      <div className="app-shell app-shell--narrow">
        <h1 className="page-title">Reset password</h1>
        <div className="card">
          <p className="form-error" role="alert">
            {error}
          </p>
          <p style={{ marginTop: "var(--space-md)" }}>
            <Link href="/login" className="btn btn-primary">
              Back to log in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell app-shell--narrow">
      <h1 className="page-title">Reset password</h1>
      <div className="card">
        <p className="text-muted">Confirming your link…</p>
      </div>
    </div>
  );
}
