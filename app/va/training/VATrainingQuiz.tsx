"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VA_TRAINING_QUIZ_QUESTIONS, TRAINING_QUIZ_PASS_PCT } from "@/lib/va-training-quiz";

export default function VATrainingQuiz() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    passed: boolean;
    scorePct: number;
    correct: number;
    total: number;
  } | null>(null);

  function setAnswer(qId: string, letter: string) {
    setAnswers((prev) => ({ ...prev, [qId]: letter }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/va/training-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setResult({
        passed: data.passed,
        scorePct: data.scorePct,
        correct: data.correct,
        total: data.total,
      });
      if (data.passed) {
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetake() {
    setResult(null);
    setAnswers({});
    setError(null);
  }

  if (result?.passed) {
    return (
      <div className="card" style={{ maxWidth: "720px", marginTop: "var(--space-xl)" }}>
        <p style={{ margin: 0, color: "var(--color-success, green)", fontWeight: 500 }}>
          You passed the training quiz. You can now claim tasks from the Tasks page.
        </p>
        <p style={{ margin: "var(--space-sm) 0 0" }}>
          <Link href="/va/tasks" className="btn btn-primary">
            Go to Tasks
          </Link>
        </p>
      </div>
    );
  }

  if (result && !result.passed) {
    return (
      <div className="card" style={{ maxWidth: "720px", marginTop: "var(--space-xl)", borderColor: "var(--color-error, #b91c1c)" }}>
        <p style={{ margin: 0, marginBottom: "var(--space-sm)" }}>
          You scored <strong>{result.scorePct}%</strong> ({result.correct}/{result.total}). You need {TRAINING_QUIZ_PASS_PCT}% to pass. Please reread the training above and try again.
        </p>
        <button type="button" onClick={handleRetake} className="btn btn-primary">
          Retake quiz
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: "720px", marginTop: "var(--space-xl)" }}>
      <h2 className="section-heading" style={{ marginTop: 0, marginBottom: "var(--space-sm)" }}>
        Take the quiz
      </h2>
      <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
        When you&apos;re ready, answer the questions below. You need {TRAINING_QUIZ_PASS_PCT}% to pass and unlock task access.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
        {VA_TRAINING_QUIZ_QUESTIONS.map((q) => (
          <div key={q.id} className="form-group">
            <span className="form-note" style={{ display: "block", marginBottom: "var(--space-sm)" }}>
              {q.question}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
              {q.options.map((opt) => (
                <label
                  key={opt.letter}
                  style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-sm)", cursor: "pointer" }}
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
        ))}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit quiz"}
        </button>
      </form>
    </div>
  );
}
