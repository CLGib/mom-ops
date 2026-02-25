"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "magiclink" | "forgot";

function formatAuthError(message: string): string {
  if (
    /rate limit|too many requests|too many attempts/i.test(message)
  ) {
    return "Too many emails sent. Please wait a few minutes and try again.";
  }
  return message;
}

export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const isCheckoutIntent = next.includes("checkout=1");

  const [mode, setMode] = useState<Mode>(isCheckoutIntent ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirectingToCheckout, setRedirectingToCheckout] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);

  // Cooldown countdown after sending an email (avoids hitting rate limit)
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const t = setInterval(() => {
      setEmailCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [emailCooldown]);

  // When returning from magic link click, session exists — full page redirect so server sees cookies
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = next;
      }
    });
  }, [next]);

  function redirect() {
    // Full page load so the server receives the session cookies set by Supabase
    window.location.href = next;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSignupSuccess(false);
    setMagicLinkSent(false);
    setResetLinkSent(false);
    setLoading(true);

    const supabase = createClient();

    if (mode === "forgot") {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (err) {
        setError(formatAuthError(err.message));
        if (/rate limit|too many/i.test(err.message)) setEmailCooldown(120);
        return;
      }
      setResetLinkSent(true);
      setEmailCooldown(60);
      return;
    }

    if (mode === "magiclink") {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/login?next=${encodeURIComponent(next)}`,
        },
      });
      setLoading(false);
      if (err) {
        setError(formatAuthError(err.message));
        if (/rate limit|too many/i.test(err.message)) setEmailCooldown(120);
        return;
      }
      setMagicLinkSent(true);
      setEmailCooldown(60);
      return;
    }

    if (mode === "login") {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (err) {
        setError(formatAuthError(err.message));
        return;
      }
      redirect();
      return;
    }

    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // After they confirm via email, land on /?checkout=1 so CheckoutRedirect sends them to Stripe.
        // Add this URL to Supabase Auth → URL Configuration → Redirect URLs (e.g. http://localhost:3000/?checkout=1).
        emailRedirectTo: `${window.location.origin}/?checkout=1`,
      },
    });
    setLoading(false);
    if (err) {
      setError(formatAuthError(err.message));
      if (/rate limit|too many/i.test(err.message)) setEmailCooldown(120);
      return;
    }
    if (data?.user?.identities?.length === 0) {
      setError("An account with this email already exists. Try logging in.");
      return;
    }
    setEmailCooldown(60);
    if (data?.session != null) {
      fetch("/api/emails/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          template: "welcome_v1",
          payload: { user_id: data.user.id },
          dedupe_key: `welcome:${data.user.id}`,
        }),
      }).catch(() => {});
      setRedirectingToCheckout(true);
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          credentials: "include",
        });
        const checkoutData = await res.json().catch(() => ({}));
        if (res.ok && checkoutData.url) {
          window.location.href = checkoutData.url;
          return;
        }
      } catch {
        // fall through to redirect()
      }
      setRedirectingToCheckout(false);
      redirect();
      return;
    }
    setSignupSuccess(true);
  }

  const isEmailCooldown = emailCooldown > 0;

  return (
    <>
      <div className="auth-tabs">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={mode === "login" ? "auth-tab auth-tab--active" : "auth-tab"}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={mode === "signup" ? "auth-tab auth-tab--active" : "auth-tab"}
        >
          Sign up
        </button>
        <button
          type="button"
          onClick={() => setMode("magiclink")}
          className={mode === "magiclink" ? "auth-tab auth-tab--active" : "auth-tab"}
        >
          Email me a link
        </button>
      </div>

      {mode === "login" && (
        <p style={{ marginTop: "var(--space-sm)", marginBottom: 0 }}>
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className="form-note"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline", color: "inherit" }}
          >
            Forgot password?
          </button>
        </p>
      )}

      {magicLinkSent && (
        <p className="auth-success-message" role="status">
          Check your email for the sign-in link. Click it and you&apos;ll be signed in.
        </p>
      )}

      {resetLinkSent && (
        <p className="auth-success-message" role="status">
          Check your email for the password reset link. Click it to set a new password.
        </p>
      )}

      {isEmailCooldown && (mode === "magiclink" || mode === "signup" || mode === "forgot") && (
        <p className="form-note" role="status">
          You can request another link in {emailCooldown} seconds.
        </p>
      )}

      {signupSuccess && (
        <p className="auth-success-message" role="status">
          Check your email to confirm your account. After confirming, log in and
          you&apos;ll be taken to checkout.
        </p>
      )}

      <form onSubmit={handleSubmit}>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-group">
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="input"
          />
        </div>
        {mode !== "magiclink" && mode !== "forgot" && (
          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="input"
              minLength={mode === "signup" ? 8 : undefined}
            />
          </div>
        )}
        {(mode === "forgot" || mode === "login" || mode === "signup" || mode === "magiclink") && (
          <p style={{ marginTop: "var(--space-xs)", marginBottom: 0 }}>
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="form-note"
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline", color: "inherit" }}
              >
                ← Back to log in
              </button>
            )}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || redirectingToCheckout || ((mode === "magiclink" || mode === "signup" || mode === "forgot") && isEmailCooldown)}
          className="btn btn-primary"
          style={{ width: "100%", marginTop: "var(--space-sm)" }}
        >
          {redirectingToCheckout
            ? "Redirecting to checkout…"
            : loading
              ? mode === "magiclink"
                ? "Sending link…"
                : mode === "forgot"
                  ? "Sending reset link…"
                  : mode === "login"
                    ? "Signing in…"
                    : "Creating account…"
              : mode === "magiclink"
                ? "Send me a sign-in link"
                : mode === "forgot"
                  ? "Send reset link"
                  : mode === "login"
                    ? "Log in"
                    : "Sign up"}
        </button>
      </form>
    </>
  );
}
