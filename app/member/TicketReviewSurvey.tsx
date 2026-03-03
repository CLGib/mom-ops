"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitTicketReview } from "./actions";

type Props = { ticketId: string };

type Visibility = "private" | "public";

export default function TicketReviewSurvey({ ticketId }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating == null) {
      setError("Please choose a rating from 1 to 5.");
      return;
    }
    setSubmitting(true);
    const result = await submitTicketReview(ticketId, rating, feedback.trim() || null, visibility);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      router.refresh();
    }, 1500);
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
        <fieldset>
          <legend className="form-note" style={{ marginBottom: "var(--space-xs)" }}>
            Share this review publicly? (optional)
          </legend>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", cursor: "pointer" }}>
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === "public"}
                onChange={() => setVisibility("public")}
                aria-describedby="visibility-help"
              />
              <span>Public (recommended)</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", cursor: "pointer" }}>
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === "private"}
                onChange={() => setVisibility("private")}
                aria-describedby="visibility-help"
              />
              <span>Private</span>
            </label>
          </div>
          <p id="visibility-help" className="form-note" style={{ marginTop: "var(--space-xs)" }}>
            Public reviews inspire other members to try similar tasks and help the community. Your name, photo, task title, and rating will be shown. Don&apos;t include personal details like addresses, phone numbers, or private info.
          </p>
        </fieldset>
        {success && (
          <p role="status" className="form-note" style={{ color: "var(--color-success, #15803d)" }}>
            Review saved. Thanks for your feedback!
          </p>
        )}
        {error && (
          <p className="form-note" style={{ color: "var(--color-error, #b91c1c)" }} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting || success || rating == null}>
          {submitting ? "Submitting…" : "Submit review"}
        </button>
      </form>
    </section>
  );
}
