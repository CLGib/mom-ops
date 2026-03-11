"use client";

import { useState, useRef, useEffect } from "react";

/** Common emojis for tasks/messages: reactions, status, friendly. */
const EMOJI_GRID = [
  "😀", "😊", "👍", "❤️", "🙏", "✅", "🎉", "💡",
  "😅", "🙂", "👋", "💪", "✨", "🔥", "📌", "💬",
  "🤝", "👏", "💯", "⭐", "📋", "🔔", "📅", "🙌",
];

type Props = {
  /** Called when user selects an emoji; parent should insert at cursor. */
  onInsert: (emoji: string) => void;
  /** Optional label for the trigger (default: "Emoji"). */
  ariaLabel?: string;
};

export default function EmojiPicker({ onInsert, ariaLabel = "Insert emoji" }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "1rem" }}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        😀
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Emoji picker"
          style={{
            position: "absolute",
            left: 0,
            top: "100%",
            marginTop: "var(--space-2xs)",
            padding: "var(--space-xs)",
            background: "var(--color-bg, #fff)",
            border: "1px solid var(--color-border, #e5e5e5)",
            borderRadius: "var(--radius, 6px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            display: "grid",
            gridTemplateColumns: "repeat(8, 1.75rem)",
            gap: "2px",
            zIndex: 11,
          }}
        >
          {EMOJI_GRID.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              type="button"
              className="btn"
              style={{
                padding: 2,
                fontSize: "1.1rem",
                lineHeight: 1,
                minWidth: "1.75rem",
                minHeight: "1.75rem",
              }}
              onClick={() => {
                onInsert(emoji);
                setOpen(false);
              }}
              aria-label={`Insert ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
