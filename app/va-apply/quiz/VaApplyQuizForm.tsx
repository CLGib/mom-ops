"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VA_QUIZ_QUESTIONS } from "@/lib/va-apply-quiz";

export default function VaApplyQuizForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setAnswer(qId: string, letter: string) {
    setAnswers((prev) => ({ ...prev, [qId]: letter }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/va-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim() || undefined,
          answers,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push("/va-apply/thank-you");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  let lastCompetency = "";
  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
      <div className="form-group">
        <label htmlFor="va-apply-email">Email (required)</label>
        <input
          id="va-apply-email"
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </div>
      <div className="form-group">
        <label htmlFor="va-apply-name">Name (optional)</label>
        <input
          id="va-apply-name"
          type="text"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
        />
      </div>

      {VA_QUIZ_QUESTIONS.map((q) => {
        const showCompetency = q.competency !== lastCompetency;
        if (showCompetency) lastCompetency = q.competency;
        return (
          <section key={q.id} className="card">
            {showCompetency && (
              <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>
                {q.competency}
              </h2>
            )}
            <div className="form-group">
              <span className="form-note" style={{ display: "block", marginBottom: "var(--space-sm)" }}>
                {q.question}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
                {q.options.map((opt) => (
                  <label
                    key={opt.letter}
                    style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-sm)" }}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.letter}
                      checked={answers[q.id] === opt.letter}
                      onChange={() => setAnswer(q.id, opt.letter)}
                      style={{ marginTop: "0.25rem" }}
                    />
                    <span>
                      <strong>{opt.letter}.</strong> {opt.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {error && (
        <p className="form-note" style={{ color: "var(--color-error, #b91c1c)", margin: 0 }} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
