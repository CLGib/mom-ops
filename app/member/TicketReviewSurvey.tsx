"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitTicketReview } from "./actions";

type Props = { ticketId: string };

export default function TicketReviewSurvey({ ticketId }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating == null) {
      setError("Please choose a rating from 1 to 5.");
      return;
    }
    setSubmitting(true);
    const result = await submitTicketReview(ticketId, rating, feedback.trim() || null);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <section
      id="rate"
      className="card"
      style={{ marginBottom: "var(--space-lg)" }}
      aria-label="Rate this task"
    >
      <h2 className="section-heading">Rate this task</h2>
      <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
        Your feedback helps us improve. How was your experience?
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        <div>
          <span className="form-note" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
            Rating (required)
          </span>
          <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={rating === n ? "btn btn-primary" : "btn btn-secondary"}
                style={{ minWidth: "2.5rem" }}
                aria-pressed={rating === n}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="review-feedback" className="form-note" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
            Anything else you&apos;d like to share? (optional)
          </label>
          <textarea
            id="review-feedback"
            className="input"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Optional feedback or review..."
            rows={3}
            style={{ width: "100%", maxWidth: "32rem", resize: "vertical" }}
          />
        </div>
        {error && (
          <p className="form-note" style={{ color: "var(--color-error, #b91c1c)" }} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting || rating == null}>
          {submitting ? "Submitting…" : "Submit review"}
        </button>
      </form>
    </section>
  );
}
