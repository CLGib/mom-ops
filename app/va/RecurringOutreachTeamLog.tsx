"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { formatInCentral } from "@/lib/format-date";
import type { RecurringOutreachEventRow } from "@/lib/va/recurring-outreach";
import { logRecurringOutreachEvent } from "./recurring-outreach-actions";

type Props = {
  memberId: string;
  ticketId?: string | null;
  initialEvents: RecurringOutreachEventRow[];
};

export default function RecurringOutreachTeamLog({ memberId, ticketId, initialEvents }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await logRecurringOutreachEvent({
        memberId,
        note,
        ticketId: ticketId ?? undefined,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  return (
    <section className="card" style={{ padding: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
      <h2 className="section-heading" style={{ marginTop: 0 }}>
        Recurring outreach (team log)
      </h2>
      <p className="form-note" style={{ marginBottom: "var(--space-md)", maxWidth: "40rem" }}>
        The &quot;Suggest recurring task&quot; snippet is shared across the team. Log here after you send it so others
        don&apos;t repeat the same pitch. Only staff see this list.
      </p>
      {initialEvents.length === 0 ? (
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          No entries yet.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 var(--space-md) 0", fontSize: "0.9rem" }}>
          {initialEvents.map((ev) => (
            <li
              key={ev.id}
              style={{
                padding: "var(--space-xs) 0",
                borderBottom: "1px solid var(--color-border, #e5e5e5)",
              }}
            >
              <strong>{formatInCentral(ev.created_at)}</strong>
              {ev.created_by_display_name ? ` · ${ev.created_by_display_name}` : null}
              {ev.note_text ? (
                <>
                  {" "}
                  — {ev.note_text}
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        <label htmlFor="recurring-outreach-note" className="form-note" style={{ fontWeight: 600 }}>
          Log that you sent the recurring-task suggestion (optional note)
        </label>
        <textarea
          id="recurring-outreach-note"
          className="input"
          rows={2}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Meal plan offer sent via email thread"
          style={{ resize: "vertical", minHeight: "3rem" }}
        />
        {error && (
          <p className="form-note" style={{ color: "var(--color-error, #b91c1c)" }} role="alert">
            {error}
          </p>
        )}
        <div>
          <button type="submit" className="btn btn-secondary" disabled={pending}>
            {pending ? "Saving…" : "Log outreach"}
          </button>
        </div>
      </form>
    </section>
  );
}
