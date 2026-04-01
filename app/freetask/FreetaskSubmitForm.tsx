"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import posthog from "posthog-js";
import EmojiPicker from "../components/EmojiPicker";

export default function FreetaskSubmitForm() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  function insertEmojiInDescription(emoji: string) {
    const ta = descriptionRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = description.slice(0, start) + emoji + description.slice(end);
    setDescription(newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const res = await fetch("/api/freetask-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          subject: subject.trim(),
          description: description.trim() || null,
          requested_va_id: null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      const draftId = data.draft_id;
      if (!draftId) {
        setError("Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const next = `/member?freetask_draft=${encodeURIComponent(draftId)}`;

      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (otpError) {
        setError(
          /rate limit|too many/i.test(otpError.message)
            ? "Too many emails sent. Please wait a few minutes and try again."
            : otpError.message
        );
        setSubmitting(false);
        return;
      }

      posthog.capture("freetask_draft_submitted", { email: email.trim().toLowerCase() });

      setSuccess(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div
        className="card"
        style={{
          padding: "var(--space-lg)",
          textAlign: "center",
          background: "var(--accent-soft-bg, #f8f5ed)",
          border: "1px solid var(--accent, #b8860b)",
        }}
      >
        <p role="status" style={{ margin: 0, fontSize: "1.0625rem" }}>
          Check your email — click the link to create your account and we&apos;ll submit your task.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="member-submit-form">
      <div className="form-group">
        <label htmlFor="freetask-email">Email</label>
        <input
          id="freetask-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="input"
          style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}
        />
      </div>
      <div className="form-group">
        <label htmlFor="freetask-subject">Subject</label>
        <input
          id="freetask-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className="input"
          style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}
        />
      </div>
      <div className="form-group">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-2xs)" }}>
          <label htmlFor="freetask-description" style={{ marginBottom: 0 }}>
            Description
          </label>
          <EmojiPicker onInsert={insertEmojiInDescription} ariaLabel="Insert emoji" />
        </div>
        <textarea
          ref={descriptionRef}
          id="freetask-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
          style={{ width: "100%", minWidth: 0, boxSizing: "border-box", minHeight: 140 }}
        />
      </div>
      <p className="form-note" style={{ marginTop: "var(--space-xs)" }}>
        You can add attachments after you confirm your email.
      </p>
      {error && (
        <p role="alert" className="form-note" style={{ color: "var(--color-error, #c00)", marginBottom: "var(--space-sm)" }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting}
        style={{ marginTop: "var(--space-lg)" }}
      >
        {submitting ? "Sending…" : "Submit task"}
      </button>
    </form>
  );
}
