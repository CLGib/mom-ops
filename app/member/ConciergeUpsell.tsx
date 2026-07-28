"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestConcierge } from "./actions";

type Props = { ticketId: string; alreadyRequested?: boolean };

export default function ConciergeUpsell({ ticketId, alreadyRequested = false }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState(alreadyRequested);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest() {
    setError(null);
    setSubmitting(true);
    const result = await requestConcierge(ticketId);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setRequested(true);
    router.refresh();
  }

  if (requested) {
    return (
      <section
        className="card"
        style={{ marginBottom: "var(--space-lg)", borderLeft: "3px solid var(--accent, #b8860b)" }}
        aria-label="Concierge requested"
      >
        <p style={{ margin: 0, fontWeight: 600 }}>✋ A human is on the way.</p>
        <p className="form-note" style={{ marginTop: "var(--space-xs)", marginBottom: 0 }}>
          A Mom Ops team member will reach out to take this the rest of the way — the calls, the
          bookings, whatever needs a real person.
        </p>
      </section>
    );
  }

  return (
    <section
      className="card"
      style={{ marginBottom: "var(--space-lg)" }}
      aria-label="Have a human take this further"
    >
      <p style={{ margin: 0, fontWeight: 600 }}>Need a human to take it the rest of the way?</p>
      <p className="form-note" style={{ marginTop: "var(--space-xs)" }}>
        Your assistant did the thinking. If this task needs a real person — making the calls, the
        bookings, the actual coordination — our concierge team can handle it.
      </p>
      <button
        type="button"
        onClick={handleRequest}
        disabled={submitting}
        className="btn btn-primary"
        style={{ marginTop: "var(--space-sm)" }}
      >
        {submitting ? "Requesting…" : "Have a human take this further"}
      </button>
      {error && (
        <p
          className="form-note"
          style={{ color: "var(--color-error, #b91c1c)", marginTop: "var(--space-sm)" }}
          role="alert"
        >
          {error}
        </p>
      )}
    </section>
  );
}
