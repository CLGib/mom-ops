"use client";

import { useState, useRef, useEffect } from "react";

type VaOption = { id: string; label: string; imageUrl?: string | null };

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

const avatarSize = 32;

type Props = {
  options: VaOption[];
  value: string;
  onChange: (vaId: string) => void;
  id?: string;
  ariaDescribedBy?: string;
  disabled?: boolean;
};

export default function SpecialistRequestSelect({
  options,
  value,
  onChange,
  id,
  ariaDescribedBy,
  disabled,
}: Props) {
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

  const selected = value ? options.find((o) => o.id === value) : null;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", minWidth: 0 }}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-describedby={ariaDescribedBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={selected ? `Requested specialist: ${selected.label}` : "No preference"}
        onClick={() => setOpen((o) => !o)}
        className="input"
        style={{
          width: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
          background: "var(--color-bg, #fff)",
          border: "1px solid var(--color-border, #ccc)",
          borderRadius: 4,
          padding: "var(--space-sm) var(--space-md)",
        }}
      >
        {selected ? (
          <>
            <div
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: "50%",
                overflow: "hidden",
                flexShrink: 0,
                backgroundColor: "var(--color-muted-bg, #eee)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {selected.imageUrl ? (
                <img
                  src={selected.imageUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--color-muted, #666)",
                  }}
                >
                  {getInitials(selected.label)}
                </span>
              )}
            </div>
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
              {selected.label}
            </span>
          </>
        ) : (
          <span style={{ color: "var(--color-muted, #666)" }}>No preference</span>
        )}
        <span style={{ flexShrink: 0 }} aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Choose a specialist"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            margin: 0,
            marginTop: 2,
            padding: "var(--space-xs)",
            listStyle: "none",
            background: "var(--color-bg, #fff)",
            border: "1px solid var(--color-border, #ccc)",
            borderRadius: 4,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 10,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          <li role="option" aria-selected={!value}>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                padding: "var(--space-sm) var(--space-md)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                borderRadius: 4,
                font: "inherit",
              }}
            >
              <span style={{ color: "var(--color-muted, #666)" }}>No preference</span>
            </button>
          </li>
          {options.map((va) => (
            <li key={va.id} role="option" aria-selected={value === va.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(va.id);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-sm)",
                  padding: "var(--space-sm) var(--space-md)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  borderRadius: 4,
                  font: "inherit",
                }}
              >
                <div
                  style={{
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: "50%",
                    overflow: "hidden",
                    flexShrink: 0,
                    backgroundColor: "var(--color-muted-bg, #eee)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {va.imageUrl ? (
                    <img
                      src={va.imageUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--color-muted, #666)",
                      }}
                    >
                      {getInitials(va.label)}
                    </span>
                  )}
                </div>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {va.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
