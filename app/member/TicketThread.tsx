"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "task-attachments";
const MAX_FILE_SIZE_MB = 25;
const MAX_FILES = 5;

type Props = {
  ticketId: string;
  senderId: string;
  senderRole: string;
};

function getMediaType(file: File): "image" | "video" | "audio" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "video";
}

export default function TicketThread({
  ticketId,
  senderId,
  senderRole,
}: Props) {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function execCmd(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const html = editorRef.current?.innerHTML?.trim() ?? "";
    const text = editorRef.current?.innerText?.trim() ?? "";
    if (!text && files.length === 0) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data: inserted, error: insertErr } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_id: senderId,
        sender_role: senderRole,
        message: text ? html : "(attachment)",
      })
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

    if (editorRef.current) editorRef.current.innerHTML = "";
    setFiles([]);
    setSubmitting(false);
    router.refresh();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? []);
    const valid: File[] = [];
    for (const f of chosen) {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) continue;
      if (f.type.startsWith("image/") || f.type.startsWith("video/") || f.type.startsWith("audio/")) valid.push(f);
    }
    setFiles((prev) => (prev.length + valid.length > MAX_FILES ? prev.concat(valid.slice(0, MAX_FILES - prev.length)) : prev.concat(valid)));
    e.target.value = "";
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
      {error && <p className="form-note" style={{ color: "var(--color-error, #b91c1c)" }} role="alert">{error}</p>}
      {/* Rich text toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xs)", marginBottom: "var(--space-2xs)" }}>
        <button type="button" className="btn btn-secondary" style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }} onClick={() => execCmd("bold")} title="Bold">
          <strong>B</strong>
        </button>
        <button type="button" className="btn btn-secondary" style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }} onClick={() => execCmd("italic")} title="Italic">
          <em>I</em>
        </button>
        <button type="button" className="btn btn-secondary" style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }} onClick={() => execCmd("insertUnorderedList")} title="Bullet list">
          • List
        </button>
        <button type="button" className="btn btn-secondary" style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }} onClick={() => execCmd("insertOrderedList")} title="Numbered list">
          1. List
        </button>
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
            if (file && (file.type.startsWith("image/") || file.type.startsWith("video/") || file.type.startsWith("audio/"))) filesToAdd.push(file);
          }
          if (filesToAdd.length > 0) {
            e.preventDefault();
            setFiles((prev) => prev.concat(filesToAdd).slice(0, MAX_FILES));
          }
        }}
      />
      <style dangerouslySetInnerHTML={{ __html: `[data-placeholder]:empty::before { content: attr(data-placeholder); color: var(--text-soft, #8a8681); }` }} />
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)" }}>
        <input
          type="file"
          accept="image/*,video/*,audio/*"
          multiple
          onChange={onFileChange}
          className="input"
          style={{ width: "auto", maxWidth: "100%" }}
          aria-label="Attach files (photos, video, voice notes)"
        />
        {files.length > 0 && (
          <span className="form-note">
            {files.length} file{files.length !== 1 ? "s" : ""} attached. {files.map((f) => f.name).join(", ")}
          </span>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
