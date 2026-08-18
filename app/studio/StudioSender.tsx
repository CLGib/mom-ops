"use client";

import { useState } from "react";

type NoteOption = { slug: string; title: string; date: string };

export default function StudioSender({
  notes,
  subscriberCount,
}: {
  notes: NoteOption[];
  subscriberCount: number;
}) {
  const [slug, setSlug] = useState(notes[0]?.slug ?? "");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = notes.find((n) => n.slug === slug);

  async function send() {
    if (!slug) return;
    if (
      !window.confirm(
        `Send "${selected?.title}" to ${subscriberCount} subscriber${subscriberCount === 1 ? "" : "s"}? This emails real people.`
      )
    ) {
      return;
    }
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setResult(
        `Queued "${data.subject}" to ${data.queued} of ${data.recipients} subscribers. They send within ~2 minutes.`
      );
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <p className="form-note" style={{ marginTop: 0 }}>
        <strong>{subscriberCount}</strong> active subscriber{subscriberCount === 1 ? "" : "s"}.
      </p>

      <div className="form-group">
        <label htmlFor="note-select">Issue to send (a published Notebook post)</label>
        <select
          id="note-select"
          className="input"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box" }}
        >
          {notes.map((n) => (
            <option key={n.slug} value={n.slug}>
              {n.date} — {n.title}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-large"
        onClick={send}
        disabled={sending || !slug || subscriberCount === 0}
      >
        {sending ? "Queueing…" : `Send to ${subscriberCount} →`}
      </button>

      {selected && (
        <p className="form-note" style={{ marginTop: "var(--space-sm)" }}>
          Preview: <a href={`/notes/${selected.slug}`} target="_blank" rel="noreferrer" className="link">read this issue</a> before sending.
        </p>
      )}

      {result && (
        <p className="form-note" style={{ marginTop: "var(--space-md)", color: "var(--accent)" }} role="status">
          {result}
        </p>
      )}
      {error && (
        <p className="form-note" style={{ marginTop: "var(--space-md)", color: "#b91c1c" }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
