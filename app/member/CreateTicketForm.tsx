"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useRef } from "react";

const BUCKET = "task-attachments";
const MAX_FILE_SIZE_MB = 50;
const MAX_FILES = 10;

type Props = { memberId: string };

function getMediaType(file: File): "image" | "video" {
  return file.type.startsWith("image/") ? "image" : "video";
}

export default function CreateTicketForm({ memberId }: Props) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const valid: File[] = [];
    for (const f of selected) {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`"${f.name}" is over ${MAX_FILE_SIZE_MB}MB and was skipped.`);
        continue;
      }
      if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) {
        setError(`"${f.name}" is not an image or video and was skipped.`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length > MAX_FILES) {
      setFiles(valid.slice(0, MAX_FILES));
      setError(`Only the first ${MAX_FILES} files were kept.`);
    } else {
      setFiles(valid);
      setError(null);
    }
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const supabase = createClient();

    const { data: ticket, error: insertError } = await supabase
      .from("tickets")
      .insert({
        member_id: memberId,
        subject,
        description: description || null,
        status: "new",
      })
      .select("id")
      .single();

    if (insertError || !ticket) {
      setError(insertError?.message ?? "Failed to create task.");
      setSubmitting(false);
      return;
    }

    const ticketId = ticket.id;
    for (const file of files) {
      const ext = file.name.split(".").pop() || "";
      const safeName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const path = `${ticketId}/${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        setError(`Upload failed for "${file.name}": ${uploadError.message}`);
        setSubmitting(false);
        router.refresh();
        return;
      }

      await supabase.from("ticket_attachments").insert({
        ticket_id: ticketId,
        file_path: path,
        file_name: file.name,
        media_type: getMediaType(file),
      });
    }

    setSubject("");
    setDescription("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSubmitting(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="subject">Subject</label>
        <input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className="input"
        />
      </div>
      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
        />
      </div>
      <div className="form-group">
        <label htmlFor="attachments">Photos &amp; video (optional)</label>
        <input
          ref={fileInputRef}
          id="attachments"
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={onFileChange}
          className="input"
          aria-describedby="attachments-hint"
        />
        <p id="attachments-hint" className="form-note" style={{ marginTop: "var(--space-xs)" }}>
          Up to {MAX_FILES} files, {MAX_FILE_SIZE_MB}MB each. Images and video only.
        </p>
        {files.length > 0 && (
          <ul className="form-note" style={{ marginTop: "var(--space-xs)" }}>
            {files.map((f, i) => (
              <li key={i}>{f.name}</li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <p role="alert" className="form-note" style={{ color: "var(--color-error, #c00)", marginBottom: "var(--space-sm)" }}>
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit task"}
      </button>
    </form>
  );
}
