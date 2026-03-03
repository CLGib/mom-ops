"use client";

import { useState, useEffect } from "react";
import { getVAMemberNotes, addVAMemberNote, type VAMemberNoteRow } from "./actions";
import { formatInCentral } from "@/lib/format-date";

type Props = {
  ticketId: string;
  memberId: string;
};

export default function VANotesSection({ ticketId, memberId }: Props) {
  const [notes, setNotes] = useState<VAMemberNoteRow[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getVAMemberNotes(memberId, ticketId).then(({ notes: n, error: e }) => {
      setNotes(n);
      setError(e ?? null);
      setLoading(false);
    });
  }, [memberId, ticketId]);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = newNote.trim();
    if (!trimmed) return;
    setError(null);
    setSubmitting(true);
    const { error: err } = await addVAMemberNote(memberId, ticketId, trimmed);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setNewNote("");
    const { notes: n } = await getVAMemberNotes(memberId, ticketId);
    setNotes(n);
  }

  return (
    <section style={{ marginBottom: "var(--space-lg)" }}>
      <h2 className="section-heading">VA notes (only VAs see these)</h2>
      <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
        Private notes about this member. Not visible to the member or in their profile.
      </p>
      <div className="card" style={{ padding: "var(--space-md)" }}>
        <form onSubmit={handleAdd} style={{ marginBottom: "var(--space-md)" }}>
          <textarea
            className="input"
            rows={2}
            placeholder="Add a note from conversation…"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            style={{ width: "100%", marginBottom: "var(--space-xs)" }}
          />
          <button type="submit" className="btn btn-primary" disabled={submitting || !newNote.trim()}>
            {submitting ? "Adding…" : "Add note"}
          </button>
        </form>
        {error && <p role="alert" className="form-note" style={{ color: "var(--color-error, #c00)", marginBottom: "var(--space-sm)" }}>{error}</p>}
        {loading ? (
          <p className="form-note">Loading notes…</p>
        ) : notes.length === 0 ? (
          <p className="form-note">No notes yet.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem" }}>
            {notes.map((n) => (
              <li key={n.id} style={{ marginBottom: "var(--space-sm)" }}>
                <span className="ticket-meta" style={{ fontSize: "0.8rem", display: "block", marginBottom: "2px" }}>
                  {formatInCentral(n.created_at)}
                </span>
                {n.note_text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
