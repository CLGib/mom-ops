"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useRef, useEffect } from "react";
import confetti from "canvas-confetti";
import { createTicket } from "./actions";
import SpecialistRequestSelect from "../components/SpecialistRequestSelect";
import EmojiPicker from "../components/EmojiPicker";

const BUCKET = "task-attachments";
const MAX_FILE_SIZE_MB = 50;
const MAX_FILES = 10;

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

function getMediaType(file: File): "image" | "video" | "audio" | "document" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
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
  const [noRush, setNoRush] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function insertEmojiInDescription(emoji: string) {
    const ta = descriptionRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = description.slice(0, start) + emoji + description.slice(end);
    setDescription(newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  }

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

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const valid: File[] = [];
    for (const f of selected) {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`"${f.name}" is over ${MAX_FILE_SIZE_MB}MB and was skipped.`);
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
          fromSpecialistProfile,
          undefined,
          noRush
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
      setNoRush(false);
      setTemplateId("other");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccess(true);
      const count = 200;
      const defaults = { origin: { y: 0.7 }, zIndex: 9999 };
      function fire(particleRatio: number, opts: confetti.Options) {
        confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
      }
      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
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
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-2xs)" }}>
          <label htmlFor="description" style={{ marginBottom: 0 }}>Description</label>
          <EmojiPicker onInsert={insertEmojiInDescription} ariaLabel="Insert emoji" />
        </div>
        <textarea
          ref={descriptionRef}
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
        <label htmlFor="attachments">Attachments (optional)</label>
        <input
          ref={fileInputRef}
          id="attachments"
          type="file"
          accept="*"
          multiple
          onChange={onFileChange}
          className="input"
          aria-describedby="attachments-hint"
        />
        <p id="attachments-hint" className="form-note" style={{ marginTop: "var(--space-xs)" }}>
          Up to {MAX_FILES} files, {MAX_FILE_SIZE_MB}MB each. Photos, video, audio, PDF, and other files. Or record a voice note below.
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
                  {getMediaType(f) === "document" && (
                    <p className="form-note" style={{ marginTop: "var(--space-xs)" }}>File: {f.name}</p>
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
      <div className="form-group">
        <label style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-sm)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={noRush}
            onChange={(e) => setNoRush(e.target.checked)}
            style={{ marginTop: "0.2rem" }}
            aria-describedby="no-rush-hint"
          />
          <span>
            <strong>No rush</strong> — save 2 credits. We&apos;ll get to it within 3–5 business days.
          </span>
        </label>
        <p id="no-rush-hint" className="form-note" style={{ marginTop: "var(--space-2xs)", marginLeft: "1.75rem" }}>
          Great if your task can wait; you&apos;ll be charged 2 fewer credits when the task is completed.
        </p>
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
