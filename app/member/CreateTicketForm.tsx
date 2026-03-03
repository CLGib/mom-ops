"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useRef, useEffect } from "react";
import { createTicket } from "./actions";
import SpecialistRequestSelect from "../components/SpecialistRequestSelect";

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

type VaOption = { id: string; label: string; imageUrl?: string | null };
type Props = {
  memberId: string;
  aiEnabled?: boolean;
  pastVas?: VaOption[];
  initialSubject?: string;
  initialDescription?: string;
  initialCreditCost?: number;
  initialRequestedVaId?: string;
  initialCategory?: string;
  fromReviewId?: string;
  fromReviewVaName?: string | null;
  fromSpecialistProfile?: boolean;
  requestedVaUnavailable?: boolean;
};

function getMediaType(file: File): "image" | "video" | "audio" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "video";
}

function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/") || getMediaType(file) === "audio";
}

export default function CreateTicketForm({
  memberId,
  aiEnabled = false,
  pastVas = [],
  initialSubject,
  initialDescription,
  initialRequestedVaId,
  initialCategory,
  fromReviewId,
  fromReviewVaName,
  fromSpecialistProfile,
  requestedVaUnavailable,
}: Props) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState<string>(initialCategory ?? "other");
  const [subject, setSubject] = useState(initialSubject ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [requestedVaId, setRequestedVaId] = useState(initialRequestedVaId ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (initialSubject != null) setSubject(initialSubject);
    if (initialDescription != null) setDescription(initialDescription);
    if (initialRequestedVaId != null) setRequestedVaId(initialRequestedVaId);
    if (initialCategory != null) setTemplateId(initialCategory);
  }, [initialSubject, initialDescription, initialRequestedVaId, initialCategory]);

  const needSynthOption =
    (fromReviewId || fromSpecialistProfile) &&
    initialRequestedVaId &&
    !pastVas.some((p) => p.id === initialRequestedVaId);
  const effectivePastVas: VaOption[] = needSynthOption
    ? [...pastVas, { id: initialRequestedVaId, label: fromReviewId ? "Same specialist as this review" : "Requested specialist", imageUrl: null }]
    : pastVas;

  const [objectUrls, setObjectUrls] = useState<string[]>([]);
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setObjectUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAccessToken(session?.access_token ?? null);
      setSessionLoaded(true);
    };
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => subscription.unsubscribe();
  }, []);

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

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    if (!sessionLoaded) {
      setError("Loading session…");
      setSubmitting(false);
      return;
    }
    if (!accessToken?.trim()) {
      setError("Not logged in. Please refresh the page or log in again.");
      setSubmitting(false);
      return;
    }

    try {
      // Debug: verify session/token before submit (safe: no token value logged)
      if (process.env.NODE_ENV === "development") {
        console.debug("[CreateTicketForm] submit:", {
          sessionLoaded,
          hasToken: !!accessToken,
          tokenLength: accessToken?.length ?? 0,
        });
      }
      const supabase = createClient();
      let result: { ticketId?: string; error?: string };
      try {
        result = await createTicket(
          subject,
          description || null,
          accessToken,
          requestedVaId.trim() || null,
          fromReviewId?.trim() || null,
          templateId || null,
          fromSpecialistProfile
        );
      } catch (actionErr) {
        setError("Something went wrong. Please try again.");
        return;
      }
      const ticketId = result?.ticketId;
      const createError = result?.error;
      if (createError || !ticketId) {
        setError(createError ?? "Failed to create task.");
        return;
      }

      for (const file of files) {
        const ext = file.name.split(".").pop() || "";
        const safeName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const path = `${ticketId}/${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });

        if (uploadError) {
          setError(`Upload failed for "${file.name}": ${uploadError.message}`);
          router.refresh();
          return;
        }

        const { error: attachError } = await supabase.from("ticket_attachments").insert({
          ticket_id: ticketId,
          file_path: path,
          file_name: file.name,
          media_type: getMediaType(file),
        });
        if (attachError) {
          setError(`Could not attach "${file.name}". Task was created; you can add details in the task.`);
          router.refresh();
          return;
        }
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
      setRequestedVaId("");
      setFiles([]);
      setTemplateId("other");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
    <form onSubmit={handleSubmit} className="member-submit-form">
      {(fromReviewId || fromSpecialistProfile) && (fromReviewVaName || requestedVaId) && (
        <>
          <p
            className="form-note"
            style={{
              marginBottom: requestedVaUnavailable ? "var(--space-xs)" : "var(--space-md)",
              padding: "var(--space-sm) var(--space-md)",
              background: "var(--accent-soft-bg, #f8f5ed)",
              borderRadius: 6,
              borderLeft: "3px solid var(--accent, #b8860b)",
            }}
            role="status"
          >
            You are requesting <strong>{fromReviewVaName || "this specialist"}</strong>
            {fromReviewId ? " based on a past review." : "."}
          </p>
          {requestedVaUnavailable && (
            <p className="form-note" style={{ marginBottom: "var(--space-md)", color: "var(--text-muted, #5c5955)" }}>
              This specialist may be unavailable (onboarding in progress). You can still submit; we&apos;ll assign another specialist if needed. Or clear the preferred specialist below.
            </p>
          )}
        </>
      )}
      <div className="form-group">
        <label htmlFor="task-template">Quick pick</label>
        <select
          id="task-template"
          value={templateId}
          onChange={onTemplateChange}
          className="input"
          style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}
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
          style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}
        />
      </div>
      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
          style={{ width: "100%", minWidth: 0, boxSizing: "border-box", minHeight: 140 }}
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
      {(effectivePastVas.length > 0 || (fromReviewId && initialRequestedVaId) || (fromSpecialistProfile && initialRequestedVaId)) && (
        <div className="form-group">
          <label htmlFor="request-va">Request a specialist (optional)</label>
          <p id="request-va-hint" className="form-note" style={{ marginBottom: "var(--space-xs)" }}>
            If they&apos;re available, we&apos;ll route your task to them.
          </p>
          <SpecialistRequestSelect
            id="request-va"
            options={effectivePastVas}
            value={requestedVaId}
            onChange={setRequestedVaId}
            ariaDescribedBy="request-va-hint"
          />
        </div>
      )}
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
          <ul style={{ marginTop: "var(--space-sm)", listStyle: "none", padding: 0 }}>
            {files.map((f, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "var(--space-sm)",
                  marginBottom: "var(--space-md)",
                  padding: "var(--space-sm)",
                  background: "var(--color-bg-subtle, #f5f5f5)",
                  borderRadius: 4,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontWeight: 500 }}>
                    {f.name}
                  </p>
                  {isAudioFile(f) && objectUrls[i] && (
                    <audio
                      src={objectUrls[i]}
                      controls
                      style={{ width: "100%", maxWidth: 320, marginTop: "var(--space-xs)" }}
                      preload="metadata"
                    />
                  )}
                  {getMediaType(f) === "image" && objectUrls[i] && (
                    <img
                      src={objectUrls[i]}
                      alt={f.name}
                      style={{ maxWidth: 120, maxHeight: 120, objectFit: "cover", borderRadius: 4, marginTop: "var(--space-xs)" }}
                    />
                  )}
                  {getMediaType(f) === "video" && !isAudioFile(f) && objectUrls[i] && (
                    <video
                      src={objectUrls[i]}
                      controls
                      style={{ maxWidth: 240, maxHeight: 160, marginTop: "var(--space-xs)" }}
                      preload="metadata"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="btn btn-secondary"
                  style={{ flexShrink: 0, color: "var(--color-error, #c00)" }}
                  aria-label={`Remove ${f.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: "var(--space-md)" }}>
          {!recording ? (
            <button type="button" onClick={startRecording} className="btn btn-secondary" disabled={files.length >= MAX_FILES}>
              Record voice note
            </button>
          ) : (
            <button type="button" onClick={stopRecording} className="btn btn-secondary" style={{ color: "var(--color-error, #c00)" }}>
              Stop recording
            </button>
          )}
          {files.length >= MAX_FILES && (
            <p className="form-note" style={{ marginTop: "var(--space-xs)" }}>
              Max {MAX_FILES} files. Remove one to add another.
            </p>
          )}
        </div>
      </div>
      {success && (
        <p role="status" className="form-note" style={{ color: "var(--color-success, #15803d)", marginBottom: "var(--space-sm)" }}>
          Task submitted! We&apos;ll get right on it.
        </p>
      )}
      {error && (
        <p role="alert" className="form-note" style={{ color: "var(--color-error, #c00)", marginBottom: "var(--space-sm)" }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting || !sessionLoaded || !accessToken}
        style={{ marginTop: "var(--space-lg)" }}
      >
        {!sessionLoaded ? "Loading…" : submitting ? "Submitting…" : "Submit task"}
      </button>
    </form>
  );
}
