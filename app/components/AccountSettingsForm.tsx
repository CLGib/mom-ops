"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialEmail: string;
};

export default function AccountSettingsForm({ initialEmail }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEmailSuccess(false);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Email is required.");
      return;
    }
    if (trimmed === initialEmail) {
      setError("Enter a new email address.");
      return;
    }
    setEmailLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ email: trimmed });
    setEmailLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setEmailSuccess(true);
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPasswordSuccess(false);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setPasswordLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setPasswordLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setPasswordSuccess(true);
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h2 className="section-heading" style={{ marginTop: 0, marginBottom: "var(--space-md)" }}>
        Account (email &amp; password)
      </h2>

      {error && (
        <p className="form-error" style={{ marginBottom: "var(--space-sm)" }} role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleEmailSubmit} style={{ marginBottom: "var(--space-xl)" }}>
        <div className="form-group">
          <label htmlFor="account-email">Email</label>
          <input
            id="account-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            required
            autoComplete="email"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={emailLoading}>
          {emailLoading ? "Updating…" : "Update email"}
        </button>
        {emailSuccess && (
          <p className="form-note" style={{ marginTop: "var(--space-sm)", color: "var(--color-success, green)" }}>
            Check your new email for a confirmation link. Your email will update after you confirm.
          </p>
        )}
      </form>

      <hr style={{ border: "none", borderTop: "1px solid var(--color-border, #e5e5e5)", margin: "var(--space-lg) 0" }} />

      <form onSubmit={handlePasswordSubmit}>
        <div className="form-group">
          <label htmlFor="account-new-password">New password</label>
          <input
            id="account-new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            minLength={8}
            autoComplete="new-password"
            placeholder="Leave blank to keep current"
          />
        </div>
        <div className="form-group">
          <label htmlFor="account-confirm-password">Confirm new password</label>
          <input
            id="account-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={passwordLoading || !password.trim()}>
          {passwordLoading ? "Updating…" : "Update password"}
        </button>
        {passwordSuccess && (
          <p className="form-note" style={{ marginTop: "var(--space-sm)", color: "var(--color-success, green)" }}>
            Password updated.
          </p>
        )}
      </form>
    </div>
  );
}
