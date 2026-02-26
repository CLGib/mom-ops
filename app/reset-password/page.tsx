"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session && !cancelled) setReady(true);
    });
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const session = data.session;
      if (cancelled) return;
      if (session) {
        setReady(true);
      } else {
        const t = setTimeout(() => {
          if (cancelled) return;
          supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
            const s = data.session;
            if (!cancelled && !s) setInvalidLink(true);
          });
        }, 2000);
        return () => clearTimeout(t);
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  }

  if (invalidLink) {
    return (
      <div className="app-shell app-shell--narrow">
        <h1 className="page-title">Reset password</h1>
        <div className="card">
          <p className="form-error" role="alert">
            This link is invalid or has expired. Request a new reset link from the login page.
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

  if (!ready) {
    return (
      <div className="app-shell app-shell--narrow">
        <h1 className="page-title">Reset password</h1>
        <div className="card">
          <p className="text-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="app-shell app-shell--narrow">
        <h1 className="page-title">Password updated</h1>
        <div className="card">
          <p className="auth-success-message" role="status">
            Your password has been updated. Redirecting you to log in…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell app-shell--narrow">
      <h1 className="page-title">Set new password</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-group">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%" }}
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
