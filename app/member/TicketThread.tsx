"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import posthog from "posthog-js";
import EmojiPicker from "../components/EmojiPicker";

const BUCKET = "task-attachments";
const MAX_FILE_SIZE_MB = 25;
const MAX_FILES = 5;

type Props = {
  ticketId: string;
  senderId: string;
  senderRole: string;
  /** When true, show "Internal note" checkbox (admin only). */
  canSendInternalNote?: boolean;
};

function getMediaType(file: File): "image" | "video" | "audio" | "document" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

export default function TicketThread({
  ticketId,
  senderId,
  senderRole,
  canSendInternalNote = false,
}: Props) {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalNote, setInternalNote] = useState(false);

  function execCmd(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  }

  function insertEmoji(emoji: string) {
    editorRef.current?.focus();
    document.execCommand("insertText", false, emoji);
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
    if (canSendInternalNote) insertPayload.internal = internalNote;
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

    for (const file of files) {
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

    posthog.capture("ticket_message_sent", {
      ticket_id: ticketId,
      sender_role: senderRole,
      has_attachments: files.length > 0,
      attachment_count: files.length,
    });
    if (
      senderRole === "member" &&
      inserted?.id &&
      !(canSendInternalNote && internalNote)
    ) {
      fetch("/api/emails/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          template: "va_member_replied_v1",
          payload: {
            message_id: inserted.id,
            ticket_id: ticketId,
            message_body: text ? html : "",
          },
          dedupe_key: `va_member_replied:${inserted.id}`,
        }),
      }).catch(() => {});
    }
    if (editorRef.current) editorRef.current.innerHTML = "";
    setFiles([]);
    setSubmitting(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      router.refresh();
    }, 1500);
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
      {success && (
        <p role="status" className="form-note" style={{ color: "var(--color-success, #15803d)" }}>
          Message sent.
        </p>
      )}
      {error && <p className="form-note" style={{ color: "var(--color-error, #b91c1c)" }} role="alert">{error}</p>}
      {/* Rich text toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xs)", marginBottom: "var(--space-2xs)" }}>
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
        <EmojiPicker onInsert={insertEmoji} ariaLabel="Insert emoji" />
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Add a message…"
        className="input"
        style={{
          minHeight: 100,
          padding: "0.625rem var(--space-sm)",
          overflowWrap: "break-word",
        }}
        onPaste={(e) => {
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
      {canSendInternalNote && (
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
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)" }}>
        <input
          type="file"
          accept="*"
          multiple
          onChange={onFileChange}
          className="input"
          style={{ width: "auto", maxWidth: "100%" }}
          aria-label="Attach files (photos, video, PDF, and other files)"
        />
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
          {submitting ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
