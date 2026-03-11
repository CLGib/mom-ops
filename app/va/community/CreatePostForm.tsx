"use client";

import { useRef, useState, useEffect } from "react";

type VaPeer = { id: string; display_name: string | null };

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
};

export default function CreatePostForm({ onSuccess, onCancel }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<{
    anchorNode: Node;
    anchorOffset: number;
    focusNode: Node;
    focusOffset: number;
  } | null>(null);
  const [title, setTitle] = useState("");
  const [ticketNumberInput, setTicketNumberInput] = useState("");
  const [vaPeers, setVaPeers] = useState<VaPeer[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/va/peers", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load peers"))))
      .then((data: { vas?: VaPeer[] }) => setVaPeers(data.vas ?? []))
      .catch(() => setVaPeers([]));
  }, []);

  function openMentionDropdown() {
    const el = editorRef.current;
    if (el) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        savedSelectionRef.current = {
          anchorNode: range.startContainer,
          anchorOffset: range.startOffset,
          focusNode: range.endContainer,
          focusOffset: range.endOffset,
        };
      } else savedSelectionRef.current = null;
    }
    setMentionOpen((prev) => !prev);
  }

  function insertMention(va: VaPeer) {
    const displayName = (va.display_name?.trim() || "VA")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    const html = `<span data-mention-user-id="${va.id}" class="mention">@${displayName}</span> `;
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (sel && savedSelectionRef.current) {
      try {
        const { anchorNode, anchorOffset, focusNode, focusOffset } = savedSelectionRef.current;
        if (el.contains(anchorNode) && el.contains(focusNode)) {
          const range = document.createRange();
          range.setStart(anchorNode, anchorOffset);
          range.setEnd(focusNode, focusOffset);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } catch {
        sel?.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel?.addRange(range);
      }
    } else {
      sel?.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.addRange(range);
    }
    document.execCommand("insertHTML", false, html);
    setMentionOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const el = editorRef.current;
    const body = el?.innerHTML?.trim() ?? "";
    if (!body) {
      setError("Please enter your post.");
      return;
    }
    setError(null);
    setSubmitting(true);

    let ticketId: string | null = null;
    const num = parseInt(ticketNumberInput.trim(), 10);
    if (Number.isInteger(num) && num > 0) {
      const res = await fetch(`/api/va/community/ticket-by-number?numbers=${num}`, {
        credentials: "include",
      });
      const map = await res.json().catch(() => ({}));
      ticketId = map[String(num)] ?? null;
    }

    const res = await fetch("/api/va/community/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        body,
        title: title.trim() || undefined,
        ticket_id: ticketId ?? undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Failed to create post");
      return;
    }
    onSuccess();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card"
      style={{
        marginBottom: "var(--space-lg)",
        padding: "var(--space-md)",
        border: "1px solid var(--color-border, #e5e5e5)",
        borderRadius: "var(--radius, 6px)",
      }}
    >
      <h2 style={{ fontSize: "1.125rem", marginTop: 0, marginBottom: "var(--space-md)" }}>New post</h2>
      {error && (
        <p style={{ color: "var(--color-error, #c00)", marginBottom: "var(--space-sm)" }} role="alert">
          {error}
        </p>
      )}
      <div style={{ marginBottom: "var(--space-sm)" }}>
        <label htmlFor="community-post-title" style={{ display: "block", marginBottom: "var(--space-2xs)", fontWeight: 500 }}>
          Title (optional)
        </label>
        <input
          id="community-post-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. How I handled a Canva request"
          style={{ width: "100%", padding: "var(--space-sm) var(--space-md)", borderRadius: "var(--radius, 6px)", border: "1px solid var(--color-border, #e5e5e5)" }}
        />
      </div>
      <div style={{ marginBottom: "var(--space-sm)" }}>
        <label htmlFor="community-post-body" style={{ display: "block", marginBottom: "var(--space-2xs)", fontWeight: 500 }}>
          Post
        </label>
        <div style={{ position: "relative" }}>
          <div
            ref={editorRef}
            id="community-post-body"
            contentEditable
            role="textbox"
            aria-label="Post body"
            data-placeholder="Share your question or how you solved a task. Use #123 to link to a task. Click “Mention @” to tag another VA."
            style={{
              minHeight: 120,
              padding: "var(--space-sm) var(--space-md)",
              border: "1px solid var(--color-border, #e5e5e5)",
              borderRadius: "var(--radius, 6px)",
              background: "var(--color-bg, #fff)",
            }}
          />
          <style>{`
            [data-placeholder]:empty::before { content: attr(data-placeholder); color: var(--text-muted, #888); }
          `}</style>
          {vaPeers.length > 0 && (
            <div style={{ marginTop: "var(--space-xs)" }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }}
                onClick={openMentionDropdown}
                aria-expanded={mentionOpen}
                aria-haspopup="listbox"
              >
                Mention @
              </button>
              {mentionOpen && (
                <>
                  <div
                    role="presentation"
                    style={{ position: "fixed", inset: 0, zIndex: 10 }}
                    onClick={() => setMentionOpen(false)}
                  />
                  <ul
                    role="listbox"
                    style={{
                      position: "absolute",
                      left: 0,
                      marginTop: "var(--space-2xs)",
                      listStyle: "none",
                      padding: "var(--space-xs)",
                      margin: 0,
                      background: "var(--color-bg, #fff)",
                      border: "1px solid var(--color-border, #e5e5e5)",
                      borderRadius: "var(--radius, 6px)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      minWidth: 200,
                      maxHeight: 240,
                      overflowY: "auto",
                      zIndex: 11,
                    }}
                  >
                    {vaPeers.map((va) => (
                      <li key={va.id} role="option">
                        <button
                          type="button"
                          className="btn"
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            padding: "var(--space-xs) var(--space-sm)",
                            fontSize: "0.875rem",
                          }}
                          onClick={() => insertMention(va)}
                        >
                          @{va.display_name?.trim() || "VA"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="community-post-ticket" style={{ display: "block", marginBottom: "var(--space-2xs)", fontWeight: 500 }}>
          Link to task (optional)
        </label>
        <input
          id="community-post-ticket"
          type="number"
          min={1}
          value={ticketNumberInput}
          onChange={(e) => setTicketNumberInput(e.target.value)}
          placeholder="e.g. 123"
          style={{ width: "100%", maxWidth: 120, padding: "var(--space-sm) var(--space-md)", borderRadius: "var(--radius, 6px)", border: "1px solid var(--color-border, #e5e5e5)" }}
        />
        <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginLeft: "var(--space-sm)" }}>
          Task number you have access to (shows “Re: Task #123”)
        </span>
      </div>
      <div style={{ display: "flex", gap: "var(--space-sm)" }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Posting…" : "Post"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
