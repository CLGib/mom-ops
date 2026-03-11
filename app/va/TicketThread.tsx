"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import EmojiPicker from "../components/EmojiPicker";

const BUCKET = "task-attachments";
const MAX_FILE_SIZE_MB = 25;
const MAX_FILES = 5;

type EmailMacro = { id: string; name: string; body: string; category: string | null };
type VaPeer = { id: string; display_name: string | null };

type Props = {
  ticketId: string;
  ticketSubject?: string;
  senderId: string;
  senderRole: string;
  /** When true, VA messages are hidden from member until approved; do not send "new message" email. */
  workRequiresReview?: boolean;
  /** When true, show "Internal note" checkbox (VA/admin only). */
  canSendInternalNote?: boolean;
  /** When true, only internal notes allowed (no customer reply). Used for read-only tasks. */
  internalNotesOnly?: boolean;
  /** Member display name for macro placeholders {{Member-name}} / {{member_name}}. */
  memberDisplayName?: string;
  /** VA display name for macro placeholders {{VA NAME}} / {{va_name}}. */
  vaDisplayName?: string;
};

function getMediaType(file: File): "image" | "video" | "audio" | "document" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

/** Replace {{member-name}}, {{Member-name}}, {{member_name}}, {{va-name}}, {{VA NAME}}, {{va_name}} in macro body with context names. */
function fillMacroPlaceholders(
  body: string,
  memberDisplayName: string | undefined,
  vaDisplayName: string | undefined
): string {
  let out = body;
  const member = memberDisplayName ?? "Member";
  const va = vaDisplayName ?? "Specialist";
  out = out.replace(/\{\{member-name\}\}/gi, member);
  out = out.replace(/\{\{Member-name\}\}/gi, member);
  out = out.replace(/\{\{member_name\}\}/gi, member);
  out = out.replace(/\{\{va-name\}\}/gi, va);
  out = out.replace(/\{\{VA NAME\}\}/gi, va);
  out = out.replace(/\{\{va_name\}\}/gi, va);
  return out;
}

export default function TicketThread({
  ticketId,
  ticketSubject = "",
  senderId,
  senderRole,
  workRequiresReview = false,
  canSendInternalNote = false,
  internalNotesOnly = false,
  memberDisplayName,
  vaDisplayName,
}: Props) {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<{ anchorNode: Node; anchorOffset: number; focusNode: Node; focusOffset: number } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [macros, setMacros] = useState<EmailMacro[]>([]);
  const [macroOpen, setMacroOpen] = useState(false);
  const [internalNote, setInternalNote] = useState(internalNotesOnly);
  const [vaPeers, setVaPeers] = useState<VaPeer[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const isVa = senderRole === "va";

  useEffect(() => {
    if (!isVa) return;
    fetch("/api/va/email-macros", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load macros"))))
      .then((data: { macros?: EmailMacro[] }) => setMacros(data.macros ?? []))
      .catch(() => setMacros([]));
  }, [isVa]);

  useEffect(() => {
    if (!canSendInternalNote && !internalNotesOnly) return;
    fetch("/api/va/peers", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load peers"))))
      .then((data: { vas?: VaPeer[] }) => setVaPeers(data.vas ?? []))
      .catch(() => setVaPeers([]));
  }, [canSendInternalNote, internalNotesOnly]);

  function execCmd(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  }

  function insertEmoji(emoji: string) {
    editorRef.current?.focus();
    document.execCommand("insertText", false, emoji);
  }

  function openMacroDropdown() {
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
    setMacroOpen((prev) => !prev);
  }

  function insertMacroBody(body: string) {
    const filled = fillMacroPlaceholders(body, memberDisplayName, vaDisplayName);
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
        // fallback: collapse to end
        sel.collapse(el, 1);
      }
    } else {
      sel?.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.addRange(range);
    }
    document.execCommand("insertText", false, filled);
    setMacroOpen(false);
  }

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
    setMacroOpen(false);
  }

  function insertMention(va: VaPeer) {
    const displayName = (va.display_name?.trim() || "VA").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

  function openLinkDialog() {
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
    setLinkUrl("");
    setLinkDialogOpen(true);
    setMacroOpen(false);
    setMentionOpen(false);
  }

  function insertLink() {
    const url = linkUrl.trim();
    if (!url) return;
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
    const href = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url) ? url : `https://${url}`;
    document.execCommand("createLink", false, href);
    setLinkDialogOpen(false);
    setLinkUrl("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const html = editorRef.current?.innerHTML?.trim() ?? "";
    const text = editorRef.current?.innerText?.trim() ?? "";
    if (!text && files.length === 0) return;
    setSubmitting(true);
    const supabase = createClient();
    const insertPayload: {
      ticket_id: string;
      sender_id: string;
      sender_role: string;
      message: string;
      internal?: boolean;
    } = {
      ticket_id: ticketId,
      sender_id: senderId,
      sender_role: senderRole,
      message: text ? html : "(attachment)",
    };
    if (canSendInternalNote || internalNotesOnly) insertPayload.internal = internalNotesOnly || internalNote;
    const { data: inserted, error: insertErr } = await supabase
      .from("ticket_messages")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertErr || !inserted?.id) {
      setError(insertErr?.message ?? "Failed to send message.");
      setSubmitting(false);
      return;
    }

    for (const file of internalNotesOnly ? [] : files) {
      const ext = file.name.split(".").pop() || "";
      const path = `${ticketId}/msg_${inserted.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setError(`Upload failed: ${upErr.message}`);
        setSubmitting(false);
        router.refresh();
        return;
      }
      await supabase.from("ticket_attachments").insert({
        ticket_id: ticketId,
        message_id: inserted.id,
        file_path: path,
        file_name: file.name,
        media_type: getMediaType(file),
      });
    }

    if (editorRef.current) editorRef.current.innerHTML = "";
    setFiles([]);
    setSubmitting(false);
    router.refresh();

    if (
      senderRole === "va" &&
      inserted?.id &&
      !workRequiresReview &&
      !internalNote &&
      !internalNotesOnly
    ) {
      fetch("/api/emails/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          template: "new_message_v1",
          payload: {
            message_id: inserted.id,
            ticket_id: ticketId,
            subject: ticketSubject,
            message_body: text ? html : "",
          },
          dedupe_key: `new_message:${inserted.id}`,
        }),
      }).catch(() => {});
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? []);
    const valid: File[] = [];
    for (const f of chosen) {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) continue;
      valid.push(f);
    }
    setFiles((prev) => (prev.length + valid.length > MAX_FILES ? prev.concat(valid.slice(0, MAX_FILES - prev.length)) : prev.concat(valid)));
    e.target.value = "";
  }

  function removePendingFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
      {error && <p className="form-note" style={{ color: "var(--color-error, #b91c1c)" }} role="alert">{error}</p>}
      {/* Rich text toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xs)", marginBottom: "var(--space-2xs)", alignItems: "center" }}>
        <button type="button" className="btn btn-secondary" style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }} onClick={() => execCmd("bold")} title="Bold" aria-label="Bold">
          <strong>B</strong>
        </button>
        <button type="button" className="btn btn-secondary" style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }} onClick={() => execCmd("italic")} title="Italic" aria-label="Italic">
          <em>I</em>
        </button>
        <button type="button" className="btn btn-secondary" style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }} onClick={() => execCmd("insertUnorderedList")} title="Bullet list" aria-label="Bullet list">
          • List
        </button>
        <button type="button" className="btn btn-secondary" style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }} onClick={() => execCmd("insertOrderedList")} title="Numbered list" aria-label="Numbered list">
          1. List
        </button>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }}
            onClick={openLinkDialog}
            title="Insert link (⌘K)"
            aria-label="Insert link (⌘K)"
          >
            Link
          </button>
          {linkDialogOpen && (
            <>
              <div
                role="presentation"
                style={{ position: "fixed", inset: 0, zIndex: 10 }}
                onClick={() => setLinkDialogOpen(false)}
              />
              <div
                role="dialog"
                aria-label="Insert link"
                style={{
                  position: "absolute",
                  left: 0,
                  top: "100%",
                  marginTop: "var(--space-2xs)",
                  padding: "var(--space-sm)",
                  background: "var(--color-bg, #fff)",
                  border: "1px solid var(--color-border, #e5e5e5)",
                  borderRadius: "var(--radius, 6px)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  minWidth: 280,
                  zIndex: 11,
                }}
              >
                <label style={{ display: "block", marginBottom: "var(--space-2xs)", fontSize: "0.875rem", fontWeight: 500 }}>
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="input"
                  style={{ width: "100%", marginBottom: "var(--space-sm)" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      insertLink();
                    }
                    if (e.key === "Escape") setLinkDialogOpen(false);
                  }}
                  autoFocus
                />
                <div style={{ display: "flex", gap: "var(--space-xs)", justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setLinkDialogOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={insertLink} disabled={!linkUrl.trim()}>
                    Add link
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <EmojiPicker onInsert={insertEmoji} ariaLabel="Insert emoji" />
        {canSendInternalNote && !internalNotesOnly && (
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2xs)", fontSize: "0.875rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={internalNote}
              onChange={(e) => setInternalNote(e.target.checked)}
              aria-label="Internal note (only visible to team)"
            />
            <span>Internal note (only visible to team)</span>
          </label>
        )}
        {(canSendInternalNote || internalNotesOnly) && (internalNote || internalNotesOnly) && vaPeers.length > 0 && (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }}
              onClick={openMentionDropdown}
              aria-expanded={mentionOpen}
              aria-haspopup="listbox"
              aria-label="Mention a specialist"
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
                    top: "100%",
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
        {isVa && (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }}
              onClick={openMacroDropdown}
              aria-expanded={macroOpen}
              aria-haspopup="listbox"
              aria-label="Insert email macro"
            >
              Insert macro
            </button>
            {macroOpen && (
              <>
                <div
                  role="presentation"
                  style={{ position: "fixed", inset: 0, zIndex: 10 }}
                  onClick={() => setMacroOpen(false)}
                />
                <ul
                  role="listbox"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "100%",
                    marginTop: "var(--space-2xs)",
                    listStyle: "none",
                    padding: "var(--space-xs)",
                    margin: 0,
                    background: "var(--color-bg, #fff)",
                    border: "1px solid var(--color-border, #e5e5e5)",
                    borderRadius: "var(--radius, 6px)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    minWidth: 220,
                    maxHeight: 280,
                    overflowY: "auto",
                    zIndex: 11,
                  }}
                >
                  {macros.length === 0 ? (
                    <li style={{ padding: "var(--space-sm)", fontSize: "0.875rem", color: "var(--text-soft, #666)" }}>No macros yet</li>
                  ) : (
                    macros.map((m) => (
                      <li key={m.id} role="option">
                        <button
                          type="button"
                          className="btn"
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            padding: "var(--space-xs) var(--space-sm)",
                            fontSize: "0.875rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          onClick={() => insertMacroBody(m.body)}
                        >
                          {m.category ? `${m.category} › ` : ""}{m.name}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={internalNotesOnly ? "Add internal note for other specialists…" : "Add a message…"}
        className="input"
        style={{
          minHeight: 100,
          padding: "0.625rem var(--space-sm)",
          overflowWrap: "break-word",
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "k") {
            e.preventDefault();
            openLinkDialog();
          }
        }}
        onPaste={(e) => {
          if (internalNotesOnly) return;
          const items = e.clipboardData?.items;
          if (!items) return;
          const filesToAdd: File[] = [];
          for (let i = 0; i < items.length; i++) {
            const file = items[i].getAsFile();
            if (file) filesToAdd.push(file);
          }
          if (filesToAdd.length > 0) {
            e.preventDefault();
            setFiles((prev) => prev.concat(filesToAdd).slice(0, MAX_FILES));
          }
        }}
      />
      <style dangerouslySetInnerHTML={{ __html: `[data-placeholder]:empty::before { content: attr(data-placeholder); color: var(--text-soft, #8a8681); }` }} />
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)" }}>
        {!internalNotesOnly && (
          <input
            type="file"
            accept="*"
            multiple
            onChange={onFileChange}
            className="input"
            style={{ width: "auto", maxWidth: "100%" }}
            aria-label="Attach files (photos, video, PDF, and other files)"
          />
        )}
        {files.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: "var(--space-xs)", alignItems: "center" }}>
            {files.map((f, i) => (
              <li
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-2xs)",
                  padding: "var(--space-2xs) var(--space-sm)",
                  background: "var(--color-bg-subtle, #f0f0f0)",
                  borderRadius: 4,
                  fontSize: "0.875rem",
                }}
              >
                <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.name}>
                  {f.name}
                </span>
                <button
                  type="button"
                  onClick={() => removePendingFile(i)}
                  className="btn btn-secondary"
                  style={{ padding: "2px 6px", minWidth: "auto", fontSize: "0.875rem" }}
                  aria-label={`Remove ${f.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Sending…" : internalNotesOnly ? "Add internal note" : "Send"}
        </button>
      </div>
    </form>
  );
}
