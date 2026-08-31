"use client";

import { useState, useEffect } from "react";

type NoteOption = { slug: string; title: string; date: string; summary: string };

export default function StudioSender({
  notes,
  subscriberCount,
}: {
  notes: NoteOption[];
  subscriberCount: number;
}) {
  const [slug, setSlug] = useState(notes[0]?.slug ?? "");
  const [subject, setSubject] = useState(notes[0]?.title ?? "");
  const [body, setBody] = useState(notes[0]?.summary ?? "");
  const [testEmail, setTestEmail] = useState("christina@cg-co.com");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = notes.find((n) => n.slug === slug);

  // When the selected post changes, reset the subject + hook to that post's defaults.
  useEffect(() => {
    const n = notes.find((x) => x.slug === slug);
    if (n) {
      setSubject(n.title);
      setBody(n.summary);
    }
  }, [slug, notes]);

  async function post(test: boolean) {
    if (!slug) return;
    if (!subject.trim() || !body.trim()) {
      setError("Add a subject and a hook before sending.");
      return;
    }
    if (
      !test &&
      !window.confirm(
        `Send this to ${subscriberCount} subscriber${subscriberCount === 1 ? "" : "s"}? This emails real people.`
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
        body: JSON.stringify({ slug, subject, body, test, testEmail: test ? testEmail : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setResult(
        test
          ? `Test sent to ${testEmail}. Check that inbox in ~2 minutes to see exactly what subscribers get.`
          : `Queued to ${data.queued} of ${data.recipients} subscribers. They send within ~2 minutes.`
      );
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <p className="form-note" style={{ marginTop: 0 }}>
        <strong>{subscriberCount}</strong> active subscriber{subscriberCount === 1 ? "" : "s"}.
      </p>

      <div className="form-group">
        <label htmlFor="note-select">Which post is this issue about?</label>
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

      <div className="form-group">
        <label htmlFor="nl-subject">Subject line</label>
        <input
          id="nl-subject"
          className="input"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="A subject worth opening"
          style={{ width: "100%", boxSizing: "border-box" }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="nl-body">The email (keep it a short hook)</label>
        <textarea
          id="nl-body"
          className="input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="A few lines that make them want to click. Don't paste the whole post, tease it."
          style={{ width: "100%", boxSizing: "border-box", minHeight: 160 }}
        />
        <p className="form-note" style={{ marginTop: "var(--space-2xs)" }}>
          This is the whole email. Readers click <strong>Read the whole thing →</strong> to finish it
          on the site. Prefilled from the post summary, edit it into a real hook.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="nl-test-email">Send test to</label>
        <input
          id="nl-test-email"
          className="input"
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="an inbox you can actually check"
          style={{ width: "100%", boxSizing: "border-box" }}
        />
        <p className="form-note" style={{ marginTop: "var(--space-2xs)" }}>
          Use a different address than your own login, Gmail hides emails you send to yourself.
        </p>
      </div>

      <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => post(true)}
          disabled={sending || !slug || !testEmail.trim()}
        >
          Send test
        </button>
        <button
          type="button"
          className="btn btn-primary btn-large"
          onClick={() => post(false)}
          disabled={sending || !slug || subscriberCount === 0}
        >
          {sending ? "Queueing…" : `Send to ${subscriberCount} →`}
        </button>
      </div>

      {selected && (
        <p className="form-note" style={{ marginTop: "var(--space-sm)" }}>
          The button links to{" "}
          <a href={`/notes/${selected.slug}`} target="_blank" rel="noreferrer" className="link">
            this post
          </a>
          . Send a test to yourself first.
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
