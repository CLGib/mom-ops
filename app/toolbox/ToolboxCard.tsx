"use client";

import { useState } from "react";

export type ToolboxCardRecord = {
  id: string;
  title: string;
  prompt: string;
  suggested_ai: string | null;
  how_to_use: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  card: ToolboxCardRecord;
  currentUserId: string;
  onEdit: (card: ToolboxCardRecord) => void;
  onDelete: (id: string) => void;
};

const PROMPT_PREVIEW_LINES = 8;
const LINE_HEIGHT = 1.4;

export default function ToolboxCard({ card, currentUserId, onEdit, onDelete }: Props) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isOwner = card.created_by === currentUserId;
  const prompt = card.prompt ?? "";
  const lineCount = (prompt.match(/\n/g) || []).length + 1;
  const isLong = lineCount > PROMPT_PREVIEW_LINES;
  const displayPrompt = expanded || !isLong ? prompt : prompt.split("\n").slice(0, PROMPT_PREVIEW_LINES).join("\n");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleDelete() {
    if (confirm("Delete this card? This cannot be undone.")) onDelete(card.id);
  }

  return (
    <article
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        marginBottom: "var(--space-lg)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-md)", marginBottom: "var(--space-sm)" }}>
        <h2 className="section-heading" style={{ margin: 0, flex: 1 }}>
          {card.title}
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xs)", alignItems: "center" }}>
          {card.suggested_ai && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "var(--space-2xs) var(--space-sm)",
                borderRadius: "var(--radius, 6px)",
                backgroundColor: "var(--accent-soft-bg, #f8f5ed)",
                color: "var(--accent, #b8860b)",
              }}
            >
              {card.suggested_ai.trim()}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-secondary"
            style={{ whiteSpace: "nowrap" }}
          >
            {copied ? "Copied!" : "Copy prompt"}
          </button>
          {isOwner && (
            <>
              <button type="button" onClick={() => onEdit(card)} className="btn btn-secondary">
                Edit
              </button>
              <button type="button" onClick={handleDelete} className="btn btn-secondary" style={{ color: "var(--error, #b91c1c)" }}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>
      {card.how_to_use && (
        <p className="form-note" style={{ marginTop: 0, marginBottom: "var(--space-sm)" }}>
          {card.how_to_use}
        </p>
      )}
      <div
        style={{
          position: "relative",
          maxHeight: expanded ? "none" : `${PROMPT_PREVIEW_LINES * LINE_HEIGHT}em`,
          overflow: "auto",
          padding: "var(--space-sm)",
          backgroundColor: "var(--color-muted-bg, #f5f5f5)",
          borderRadius: "var(--radius, 6px)",
          fontFamily: "monospace",
          fontSize: "0.8125rem",
          lineHeight: LINE_HEIGHT,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {displayPrompt}
        {!expanded && isLong && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="link"
            style={{ display: "block", marginTop: "var(--space-sm)", fontSize: "0.875rem" }}
          >
            Show full prompt ({lineCount} lines)
          </button>
        )}
        {expanded && isLong && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="link"
            style={{ display: "block", marginTop: "var(--space-sm)", fontSize: "0.875rem" }}
          >
            Collapse
          </button>
        )}
      </div>
    </article>
  );
}
