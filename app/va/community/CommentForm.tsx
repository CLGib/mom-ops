"use client";

import { useRef, useState, useEffect } from "react";

type VaPeer = { id: string; display_name: string | null };

type Props = {
  postId: string;
  onSubmit: (postId: string, body: string) => void;
  submitting: boolean;
  onCancel?: () => void;
};

export default function CommentForm({ postId, onSubmit, submitting, onCancel }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<{
    anchorNode: Node;
    anchorOffset: number;
    focusNode: Node;
    focusOffset: number;
  } | null>(null);
  const [vaPeers, setVaPeers] = useState<VaPeer[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);

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
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel?.removeAllRanges();
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = editorRef.current?.innerHTML?.trim() ?? "";
    if (!body) return;
    onSubmit(postId, body);
    if (editorRef.current) editorRef.current.innerHTML = "";
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
      <div style={{ position: "relative" }}>
        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-label="Comment"
          data-placeholder="Add a comment… (you can @mention other VAs)"
          style={{
            minHeight: 80,
            padding: "var(--space-sm)",
            border: "1px solid var(--color-border, #e5e5e5)",
            borderRadius: "var(--radius, 6px)",
            background: "var(--color-bg, #fff)",
          }}
        />
        <style>{`[data-placeholder]:empty::before { content: attr(data-placeholder); color: var(--text-muted, #888); }`}</style>
        {vaPeers.length > 0 && (
          <div style={{ marginTop: "var(--space-xs)" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }}
              onClick={openMentionDropdown}
              aria-expanded={mentionOpen}
            >
              Mention @
            </button>
            {mentionOpen && (
              <>
                <div role="presentation" style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setMentionOpen(false)} />
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
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "var(--space-xs) var(--space-sm)", fontSize: "0.875rem" }}
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
      <div style={{ display: "flex", gap: "var(--space-sm)" }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Posting…" : "Post comment"}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
