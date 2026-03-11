"use client";

import { useState, useEffect } from "react";
import type { ToolboxCardRecord } from "./ToolboxCard";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editCard: ToolboxCardRecord | null;
};

export default function CreateEditCardModal({ open, onClose, onSaved, editCard }: Props) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [suggestedAi, setSuggestedAi] = useState("");
  const [howToUse, setHowToUse] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editCard;

  useEffect(() => {
    if (open) {
      setError(null);
      if (editCard) {
        setTitle(editCard.title);
        setPrompt(editCard.prompt);
        setSuggestedAi(editCard.suggested_ai ?? "");
        setHowToUse(editCard.how_to_use ?? "");
      } else {
        setTitle("");
        setPrompt("");
        setSuggestedAi("");
        setHowToUse("");
      }
    }
  }, [open, editCard]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const t = title.trim();
    const p = prompt.trim();
    if (!t || !p) {
      setError("Title and prompt are required.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const res = await fetch(`/api/toolbox/cards/${editCard.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: t,
            prompt: p,
            suggested_ai: suggestedAi.trim() || null,
            how_to_use: howToUse.trim() || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || res.statusText);
        }
      } else {
        const res = await fetch("/api/toolbox/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: t,
            prompt: p,
            suggested_ai: suggestedAi.trim() || null,
            how_to_use: howToUse.trim() || null,
          }),
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
      aria-labelledby="toolbox-modal-title"
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
        <h2 id="toolbox-modal-title" className="section-heading" style={{ marginTop: 0 }}>
          {isEdit ? "Edit card" : "Create new card"}
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
            placeholder="e.g. Mom Ops Branded Document Generator"
            required
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-label" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
            Suggested AI (optional)
          </label>
          <input
            type="text"
            className="form-input"
            value={suggestedAi}
            onChange={(e) => setSuggestedAi(e.target.value)}
            placeholder="e.g. Claude, Gemini, ChatGPT"
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-label" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
            Prompt (copy-pastable text)
          </label>
          <textarea
            className="form-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Paste or type the full prompt..."
            required
            rows={12}
            style={{ width: "100%", marginBottom: "var(--space-md)", fontFamily: "monospace", fontSize: "0.875rem" }}
          />
          <label className="form-label" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
            How to use (optional)
          </label>
          <input
            type="text"
            className="form-input"
            value={howToUse}
            onChange={(e) => setHowToUse(e.target.value)}
            placeholder="Short instruction for using this prompt"
            style={{ width: "100%", marginBottom: "var(--space-lg)" }}
          />
          <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
