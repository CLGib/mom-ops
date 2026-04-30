"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import posthog from "posthog-js";

type Mode = "login" | "magiclink" | "forgot";

type AuthFormProps = {
  defaultMode?: Mode;
  signupCopy?: boolean;
};

function formatAuthError(message: string): string {
  if (
    /rate limit|too many requests|too many attempts/i.test(message)
  ) {
    return "Too many emails sent. Please wait a few minutes and try again.";
  }
  return message;
}

export default function AuthForm({ defaultMode, signupCopy = false }: AuthFormProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const isCheckoutIntent = next.includes("checkout=1");
  const isWelcomeInviteFlow = next === "/welcome";
  const roleNotSet = searchParams.get("error") === "role_not_set";
  const otpExpired = searchParams.get("error") === "otp_expired";

  const initialMode = defaultMode ?? (isCheckoutIntent ? "magiclink" : "login");
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    otpExpired
      ? "This link has expired or was already used. Request a new link below or sign in with your password."
      : null
  );
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [signUpConfirmSent, setSignUpConfirmSent] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [clientHasSession, setClientHasSession] = useState<boolean | null>(null);

  // Cooldown countdown after sending an email (avoids hitting rate limit)
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const t = setInterval(() => {
      setEmailCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [emailCooldown]);

  // If client has a session but server showed the form (e.g. cookie not yet sent), offer one click to retry—no auto-reload to avoid loop that blocks typing
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setClientHasSession(!!session);
    });
  }, []);

  function redirect() {
    // Full page load so the server receives the session cookies and can redirect by role (A1).
    const path = signupCopy ? "/signup" : "/login";
    const url = next && next !== "/" ? `${path}?next=${encodeURIComponent(next)}` : path;
    setTimeout(() => {
      window.location.href = url;
    }, 150);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMagicLinkSent(false);
    setSignUpConfirmSent(false);
    setResetLinkSent(false);
    setLoading(true);

    const supabase = createClient();

    if (mode === "forgot") {
      // Use implicit flow so Supabase sends tokens in the URL hash; works when the link is opened
      // in a different browser/device (PKCE would require the same browser for code_verifier).
      const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const implicitClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { flowType: "implicit" } }
      );
      const { error: err } = await implicitClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
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
      // Use canonical origin so cookies are set on production domain (themomops.com), not preview URLs
      const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setLoading(false);
      if (err) {
        setError(formatAuthError(err.message));
        if (/rate limit|too many/i.test(err.message)) setEmailCooldown(120);
        return;
      }
      posthog.capture("magic_link_requested", { email });
      setMagicLinkSent(true);
      setEmailCooldown(60);
      return;
    }

    // login or sign up with password
    if (signupCopy) {
      const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setLoading(false);
      if (err) {
        setError(formatAuthError(err.message));
        return;
      }
      posthog.capture("user_signed_up", { method: "password", email });
      if (data?.session) {
        redirect();
        return;
      }
      setSignUpConfirmSent(true);
      return;
    }
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (err) {
      setLoading(false);
      setError(formatAuthError(err.message));
      return;
    }
    posthog.identify(email, { email });
    posthog.capture("user_signed_in", { method: "password", email });
    redirect();
  }

  const isEmailCooldown = emailCooldown > 0;

  return (
    <div className="auth-form">
      <div className="auth-tabs">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={mode === "login" ? "auth-tab auth-tab--active" : "auth-tab"}
        >
          {signupCopy ? "Sign up with password" : "Log in"}
        </button>
        <button
          type="button"
          onClick={() => setMode("magiclink")}
          className={mode === "magiclink" ? "auth-tab auth-tab--active" : "auth-tab"}
        >
          {signupCopy ? "Email me a link" : "Email me a link"}
        </button>
      </div>

      {mode === "magiclink" && (
        <p className="auth-form-note">
          {signupCopy
            ? "We'll send you a link to create your account. No password needed."
            : "No account? We'll send you a link to sign in or create one."}
        </p>
      )}

      {isWelcomeInviteFlow && (
        <p className="form-note" role="status" style={{ marginBottom: "var(--space-sm)" }}>
          This partnership welcome page is invite-only. Use your activation email to continue.
        </p>
      )}

      {mode === "login" && (
        <p className="auth-form-note" style={{ marginBottom: 0 }}>
          {signupCopy ? null : (
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="auth-form-link"
            >
              Forgot password?
            </button>
          )}
        </p>
      )}

      {magicLinkSent && (
        <p className="auth-success-message" role="status">
          {signupCopy
            ? "Check your email for the sign-up link. Click it to create your account."
            : "Check your email for the sign-in link. Click it to sign in or set your password."}
        </p>
      )}

      {signUpConfirmSent && (
        <p className="auth-success-message" role="status">
          Check your email to confirm your account. Once confirmed,{" "}
          <a href={next && next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="auth-form-link">
            log in
          </a>
          {" "}with your email and password.
        </p>
      )}

      {resetLinkSent && (
        <p className="auth-success-message" role="status">
          Check your email for the password reset link. Click it to set a new password.
        </p>
      )}

      {isEmailCooldown && (mode === "magiclink" || mode === "forgot") && (
        <p className="form-note" role="status">
          You can request another link in {emailCooldown} seconds.
        </p>
      )}

      {clientHasSession === true && (
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          You’re already signed in.{" "}
          <a href="/member" className="auth-form-link">
            Go to your dashboard
          </a>
        </p>
      )}
      {!signUpConfirmSent && (
      <form onSubmit={handleSubmit}>
        {roleNotSet && (
          <p className="form-error" role="alert">
            Account role not set. Contact support.
          </p>
        )}
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
            className="input auth-input"
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
              autoComplete={mode === "login" ? "current-password" : "off"}
              className="input auth-input"
            />
          </div>
        )}
        {mode === "forgot" && (
          <p style={{ marginTop: "var(--space-xs)", marginBottom: 0 }}>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="auth-form-link"
            >
              ← Back to {signupCopy ? "sign up" : "log in"}
            </button>
          </p>
        )}
        <button
          type="submit"
          disabled={loading || ((mode === "magiclink" || mode === "forgot") && isEmailCooldown)}
          className="btn btn-primary"
          style={{ width: "100%", marginTop: "var(--space-sm)" }}
        >
          {loading
            ? mode === "magiclink"
              ? "Sending link…"
              : mode === "forgot"
                ? "Sending reset link…"
                : signupCopy
                  ? "Creating account…"
                  : "Signing in…"
            : mode === "magiclink"
              ? signupCopy
                ? "Send me a sign-up link"
                : "Send me a link"
              : mode === "forgot"
                ? "Send reset link"
                : signupCopy
                  ? "Sign up"
                  : "Log in"}
        </button>
      </form>
      )}
    </div>
  );
}
