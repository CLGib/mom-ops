"use client";

import { useState } from "react";

type Props = {
  /** Light attribution for where the signup happened (e.g. "hero", "newsletter"). */
  source?: string;
  /** Button label; defaults to "Join the newsletter". */
  cta?: string;
};

export default function NewsletterSignup({ source, cta = "Join the newsletter" }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("done");
      setEmail("");
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="newsletter-success" role="status">
        You&apos;re in. Check your inbox. First note from the workshop is on its way. 🛠️
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="newsletter-form">
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        aria-label="Email address"
        className="newsletter-input"
        disabled={status === "loading"}
      />
      <button type="submit" className="btn btn-primary" disabled={status === "loading"}>
        {status === "loading" ? "Adding you…" : cta}
      </button>
      {error && (
        <p className="newsletter-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
