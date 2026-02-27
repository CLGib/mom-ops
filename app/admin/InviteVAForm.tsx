"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function InviteVAForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Enter the VA's email address.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/invite-va", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to send invite.");
        setLoading(false);
        return;
      }
      setEmail("");
      setSuccess("Magic link sent. The VA can sign in from the link in their email.");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-row" style={{ flexWrap: "wrap", gap: "var(--space-md)", alignItems: "flex-end" }}>
      {error && (
        <p className="form-error" style={{ width: "100%" }} role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="form-note" style={{ width: "100%", color: "var(--color-success, green)" }} role="status">
          {success}
        </p>
      )}
      <div className="form-group" style={{ minWidth: "16rem" }}>
        <label htmlFor="invite-va-email">VA email</label>
        <input
          id="invite-va-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="va@example.com"
          className="input"
        />
      </div>
      <div className="form-group">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Sending…" : "Create VA & send magic link"}
        </button>
      </div>
    </form>
  );
}
