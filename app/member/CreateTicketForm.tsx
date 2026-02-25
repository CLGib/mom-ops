"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useRef } from "react";

const BUCKET = "task-attachments";
const MAX_FILE_SIZE_MB = 50;
const MAX_FILES = 10;

const TASK_TEMPLATES = [
  { id: "other", label: "Something else", subject: "", description: "" },
  { id: "school", label: "School & activities", subject: "School or activities", description: "" },
  { id: "events", label: "Events & celebrations", subject: "Events or celebrations", description: "" },
  { id: "research", label: "Research & comparisons", subject: "Research or comparisons", description: "" },
  { id: "household", label: "Household admin", subject: "Household admin", description: "" },
  { id: "gifts", label: "Gifts & sourcing", subject: "Gifts or sourcing", description: "" },
] as const;

type Props = { memberId: string; aiEnabled?: boolean };

function getMediaType(file: File): "image" | "video" | "audio" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "video";
}

export default function CreateTicketForm({ memberId, aiEnabled = false }: Props) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState<string>("other");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        const ext = mime === "audio/webm" ? "webm" : "mp4";
        const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: mime });
        setFiles((prev) => (prev.length >= MAX_FILES ? prev : [...prev, file]));
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setError(null);
    } catch (err) {
      setError("Could not access microphone. Check permissions.");
    }
  }

  function stopRecording() {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
      mediaRecorderRef.current = null;
      setRecording(false);
    }
  }

  function onTemplateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setTemplateId(id);
    const t = TASK_TEMPLATES.find((x) => x.id === id);
    if (t) {
      setSubject(t.subject);
      setDescription(t.description);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const valid: File[] = [];
    for (const f of selected) {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`"${f.name}" is over ${MAX_FILE_SIZE_MB}MB and was skipped.`);
        continue;
      }
      if (!f.type.startsWith("image/") && !f.type.startsWith("video/") && !f.type.startsWith("audio/")) {
        setError(`"${f.name}" is not an image, video, or audio and was skipped.`);
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

    fetch("/api/emails/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        template: "task_submitted_v1",
        payload: { ticket_id: ticketId, subject },
        dedupe_key: `task_submitted:${ticketId}`,
      }),
    }).catch(() => {});

    setSubject("");
    setDescription("");
    setFiles([]);
    setTemplateId("other");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSubmitting(false);
    router.refresh();
  }

  async function handleExpandWithAi() {
    const text = [subject, description].filter(Boolean).join("\n").trim();
    if (!text) return;
    setExpanding(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not expand with AI.");
        return;
      }
      if (data.subject != null) setSubject(data.subject);
      if (data.description != null) setDescription(data.description);
    } catch {
      setError("Network error.");
    } finally {
      setExpanding(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="task-template">Quick pick</label>
        <select
          id="task-template"
          value={templateId}
          onChange={onTemplateChange}
          className="input"
        >
          {TASK_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
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
        {aiEnabled && (subject.trim() || description.trim()) && (
          <button
            type="button"
            onClick={handleExpandWithAi}
            disabled={expanding}
            className="btn btn-secondary"
            style={{ marginTop: "var(--space-xs)" }}
          >
            {expanding ? "Expanding…" : "Improve with AI"}
          </button>
        )}
      </div>
      <div className="form-group">
        <label htmlFor="attachments">Photos, video &amp; audio (optional)</label>
        <input
          ref={fileInputRef}
          id="attachments"
          type="file"
          accept="image/*,video/*,audio/*"
          multiple
          onChange={onFileChange}
          className="input"
          aria-describedby="attachments-hint"
        />
        <p id="attachments-hint" className="form-note" style={{ marginTop: "var(--space-xs)" }}>
          Up to {MAX_FILES} files, {MAX_FILE_SIZE_MB}MB each. Images, video, or audio. Or record a voice note below.
        </p>
        {files.length > 0 && (
          <ul className="form-note" style={{ marginTop: "var(--space-xs)" }}>
            {files.map((f, i) => (
              <li key={i}>{f.name}</li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: "var(--space-sm)" }}>
          {!recording ? (
            <button type="button" onClick={startRecording} className="btn btn-secondary">
              Record voice note
            </button>
          ) : (
            <button type="button" onClick={stopRecording} className="btn btn-secondary" style={{ color: "var(--color-error, #c00)" }}>
              Stop recording
            </button>
          )}
        </div>
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
