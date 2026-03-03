"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "feedback-attachments";

type Props = {
  onSuccess?: () => void;
};

export default function FeedbackRequestForm({ onSuccess }: Props) {
  const [type, setType] = useState<"feature" | "bug">("feature");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    let attachmentUrl: string | null = null;
    if (file) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in to attach a file.");
        setSubmitting(false);
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 80);
      const path = `${user.id}/${crypto.randomUUID()}_${safeName}`;
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadErr) {
        setError(uploadErr.message ?? "Failed to upload file.");
        setSubmitting(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
      attachmentUrl = publicUrl;
    }

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        type,
        title: title.trim(),
        description: description.trim() || null,
        attachment_url: attachmentUrl,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to submit.");
      return;
    }
    setSuccess(true);
    setTitle("");
    setDescription("");
    setFile(null);
    onSuccess?.();
  }

  if (success) {
    return (
      <div className="card" style={{ padding: "var(--space-lg)" }}>
        <p role="status" style={{ color: "var(--color-success, #0a0)", fontWeight: 500 }}>
          Thanks! Your request has been logged and is in the Backlog. We&apos;ll notify you when it&apos;s resolved.
        </p>
        <button type="button" className="btn btn-secondary" style={{ marginTop: "var(--space-md)" }} onClick={() => setSuccess(false)}>
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: "var(--space-lg)", maxWidth: 480 }}>
      <h2 className="section-heading" style={{ marginTop: 0, marginBottom: "var(--space-sm)" }}>Request a feature or report a bug</h2>
      <div className="form-group">
        <label htmlFor="fb-type">Type</label>
        <select id="fb-type" className="input" value={type} onChange={(e) => setType(e.target.value as "feature" | "bug")}>
          <option value="feature">Feature Request</option>
          <option value="bug">Bug Report</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="fb-title">Title *</label>
        <input id="fb-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Short summary" />
      </div>
      <div className="form-group">
        <label htmlFor="fb-description">Description (optional)</label>
        <textarea id="fb-description" className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="More details…" />
      </div>
      <div className="form-group">
        <label htmlFor="fb-attachment">Screenshot (optional)</label>
        <input
          id="fb-attachment"
          type="file"
          accept="image/*,.pdf"
          className="input"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file && (
          <p className="form-note" style={{ marginTop: "var(--space-2xs)", marginBottom: 0 }}>
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>
      {error && <p role="alert" className="form-note" style={{ color: "var(--color-error, #c00)", marginBottom: "var(--space-sm)" }}>{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
