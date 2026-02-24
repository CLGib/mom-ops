"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  function redirect() {
    router.push(next);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSignupSuccess(false);
    setLoading(true);

    const supabase = createClient();

    if (mode === "login") {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      redirect();
      return;
    }

    const { data, error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data?.user?.identities?.length === 0) {
      setError("An account with this email already exists. Try logging in.");
      return;
    }
    if (data?.session != null) {
      redirect();
      return;
    }
    setSignupSuccess(true);
  }

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
      </div>

      {signupSuccess && (
        <p className="auth-success-message" role="status">
          Check your email to confirm your account.
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
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ width: "100%" }}
        >
          {loading
            ? mode === "login"
              ? "Signing in…"
              : "Creating account…"
            : mode === "login"
              ? "Log in"
              : "Sign up"}
        </button>
      </form>
    </>
  );
}
