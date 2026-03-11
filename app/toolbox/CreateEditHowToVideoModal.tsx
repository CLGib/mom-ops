"use client";

import { useState, useEffect } from "react";
import type { HowToVideoRecord } from "./ToolboxHowToVideoCard";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editVideo: HowToVideoRecord | null;
  taskCategories: string[];
};

export default function CreateEditHowToVideoModal({ open, onClose, onSaved, editVideo, taskCategories }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [taskCategory, setTaskCategory] = useState("");
  const [exampleTicketNumber, setExampleTicketNumber] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editVideo;

  useEffect(() => {
    if (open) {
      setError(null);
      if (editVideo) {
        setTitle(editVideo.title);
        setDescription(editVideo.description ?? "");
        setYoutubeUrl(editVideo.youtube_url ?? "");
        setTaskCategory(editVideo.task_category ?? "");
        setExampleTicketNumber(editVideo.example_ticket_number != null ? String(editVideo.example_ticket_number) : "");
        setSortOrder(editVideo.sort_order ?? 0);
      } else {
        setTitle("");
        setDescription("");
        setYoutubeUrl("");
        setTaskCategory("");
        setExampleTicketNumber("");
        setSortOrder(0);
      }
    }
  }, [open, editVideo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const t = title.trim();
    const url = youtubeUrl.trim();
    if (!t || !url) {
      setError("Title and YouTube URL are required.");
      return;
    }
    const num = exampleTicketNumber.trim() ? parseInt(exampleTicketNumber.trim(), 10) : undefined;
    if (exampleTicketNumber.trim() && (num === undefined || Number.isNaN(num) || num < 1)) {
      setError("Example ticket number must be a positive number.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: t,
        description: description.trim(),
        youtube_url: url,
        task_category: taskCategory.trim() || null,
        example_ticket_number: num ?? null,
        sort_order: sortOrder,
      };
      if (isEdit && editVideo) {
        const res = await fetch(`/api/toolbox/how-to-videos/${editVideo.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || res.statusText);
        }
      } else {
        const res = await fetch("/api/toolbox/how-to-videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || res.statusText);
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-video-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-md)",
        backgroundColor: "rgba(0,0,0,0.4)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "36rem",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="how-to-video-modal-title" className="section-heading" style={{ marginTop: 0 }}>
          {isEdit ? "Edit how-to video" : "Add how-to video"}
        </h2>
        <form onSubmit={handleSubmit}>
          {error && (
            <p style={{ color: "var(--error, #b91c1c)", marginBottom: "var(--space-sm)" }}>
              {error}
            </p>
          )}
          <label className="form-label" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
            Title
          </label>
          <input
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. How to process a refund"
            required
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-label" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
            Description (optional)
          </label>
          <textarea
            className="form-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description for search and context"
            rows={3}
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-label" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
            YouTube URL
          </label>
          <input
            type="url"
            className="form-input"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
            required
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-label" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
            Task category (optional)
          </label>
          {taskCategories.length > 0 ? (
            <select
              className="form-input"
              value={taskCategory}
              onChange={(e) => setTaskCategory(e.target.value)}
              style={{ width: "100%", marginBottom: "var(--space-md)" }}
            >
              <option value="">— None —</option>
              {taskCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              className="form-input"
              value={taskCategory}
              onChange={(e) => setTaskCategory(e.target.value)}
              placeholder="e.g. Billing, Scheduling"
              style={{ width: "100%", marginBottom: "var(--space-md)" }}
            />
          )}
          <label className="form-label" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
            Example ticket number (optional)
          </label>
          <input
            type="number"
            min={1}
            className="form-input"
            value={exampleTicketNumber}
            onChange={(e) => setExampleTicketNumber(e.target.value)}
            placeholder="e.g. 123 — link to “See Ticket #123 for full details”"
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-label" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
            Sort order
          </label>
          <input
            type="number"
            className="form-input"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
            style={{ width: "100%", marginBottom: "var(--space-lg)" }}
          />
          <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add video"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
