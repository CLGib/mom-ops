"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function getSafeRedirect(next: string | null): string {
  if (!next || typeof next !== "string") return "/login";
  const path = next.startsWith("/") ? next : `/${next}`;
  if (/\/\/|\\\\|^\s*[a-z][a-z0-9+.-]*:/i.test(path)) return "/login";
  if (path === "/admin" || path === "/admin/") return "/admin/tasks";
  return path || "/login";
}

/**
 * Handles auth redirects where Supabase put tokens in the URL hash (magic link,
 * password recovery). The hash is not sent to the server, so we run here in the
 * browser, set the session from the hash, then redirect to the intended page.
 */
export default function AuthRecoveryClient() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (!hash) {
      setError("No sign-in data in URL. The link may have expired.");
      return;
    }

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setError("Invalid link. Request a new sign-in link from the login page.");
      return;
    }

    const nextParam = searchParams.get("next");
    const target = getSafeRedirect(nextParam);

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(() => {
        window.location.replace(target);
      })
      .catch((err: unknown) => {
        console.warn("[auth/recovery] setSession:", err);
        const message = err instanceof Error ? err.message : "Something went wrong. Try requesting a new link.";
        setError(message);
      });
  }, [searchParams]);

  if (error) {
    return (
      <div className="app-shell app-shell--narrow">
        <h1 className="page-title">Sign in</h1>
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
      <h1 className="page-title">Sign in</h1>
      <div className="card">
        <p className="text-muted">Signing you in…</p>
      </div>
    </div>
  );
}
