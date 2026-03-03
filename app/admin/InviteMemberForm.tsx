"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteMemberForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [credits, setCredits] = useState("35");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const creditsNum = parseInt(credits, 10);
    if (Number.isNaN(creditsNum) || creditsNum < 1) {
      setError("Credits must be a positive number.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invite-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), credits: creditsNum }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to send invite.");
        return;
      }
      setSuccess(true);
      setEmail("");
      setCredits("35");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 420, marginBottom: "var(--space-xl)" }}>
      <h2 className="section-heading" style={{ marginTop: 0, marginBottom: "var(--space-sm)" }}>
        Invite member (no subscription)
      </h2>
      <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
        Send an invite by email. They get the number of credits you choose. When they run out, they must purchase more or activate a subscription.
      </p>
      {error && (
        <p className="form-error" style={{ marginBottom: "var(--space-sm)" }} role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="form-note" style={{ marginBottom: "var(--space-sm)", color: "var(--color-success, green)" }}>
          Invite sent. They’ll receive an email to set their password and sign in.
        </p>
      )}
      <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="invite-member-email">Email</label>
        <input
          id="invite-member-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="member@example.com"
          className="input"
        />
      </div>
      <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="invite-member-credits">Credits to seed</label>
        <input
          id="invite-member-credits"
          type="number"
          min={1}
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
          required
          className="input"
        />
        <p className="form-note" style={{ marginTop: "var(--space-2xs)" }}>
          Number of task credits they start with. They can use these until they run out, then purchase more or subscribe.
        </p>
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Sending…" : "Send invite"}
      </button>
    </form>
  );
}
