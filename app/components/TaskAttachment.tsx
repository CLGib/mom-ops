"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type TaskAttachmentItem = {
  id: string;
  file_path: string;
  file_name: string | null;
  media_type: string;
  message_id?: string | null;
};

type Props = {
  attachment: TaskAttachmentItem;
  baseUrl: string;
  canRemove?: boolean;
  /** When true, use smaller preview (e.g. in thread) */
  compact?: boolean;
};

export default function TaskAttachment({ attachment, baseUrl, canRemove = false, compact = false }: Props) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filePath = attachment?.file_path;
  if (!filePath || !baseUrl) return null;
  const url = `${baseUrl}/${filePath}`;

  async function handleRemove() {
    if (!canRemove || removing) return;
    setError(null);
    setRemoving(true);
    const supabase = createClient();
    const { error: storageErr } = await supabase.storage.from("task-attachments").remove([attachment.file_path]);
    if (storageErr) {
      setError(storageErr.message);
      setRemoving(false);
      return;
    }
    const { error: dbErr } = await supabase.from("ticket_attachments").delete().eq("id", attachment.id);
    if (dbErr) {
      setError(dbErr.message);
      setRemoving(false);
      return;
    }
    setRemoving(false);
    router.refresh();
  }

  const size = compact ? { img: 160, videoW: 240, videoH: 160 } : { img: 200, videoW: 320, videoH: 240 };

  return (
    <li style={{ position: "relative" }}>
      {attachment.media_type === "image" ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt={attachment.file_name ?? "Attachment"}
            style={{ maxWidth: size.img, maxHeight: size.img, objectFit: "cover", borderRadius: 4 }}
          />
        </a>
      ) : attachment.media_type === "audio" ? (
        <div>
          {!compact && <p className="form-note" style={{ marginBottom: "var(--space-xs)" }}>Voice note</p>}
          <audio src={url} controls style={{ maxWidth: compact ? 280 : 320 }} />
          {attachment.file_name && (
            <p className="form-note" style={{ marginTop: "var(--space-2xs)" }}>
              <a href={url} target="_blank" rel="noopener noreferrer">{attachment.file_name}</a>
            </p>
          )}
        </div>
      ) : attachment.media_type === "document" ? (
        <div>
          <a href={url} target="_blank" rel="noopener noreferrer" className="link">
            {attachment.file_name ?? "Download attachment"}
          </a>
        </div>
      ) : (
        <div>
          <video
            src={url}
            controls
            style={{ maxWidth: size.videoW, maxHeight: size.videoH }}
            preload="metadata"
          />
          {attachment.file_name && (
            <p className="form-note" style={{ marginTop: "var(--space-2xs)" }}>
              <a href={url} target="_blank" rel="noopener noreferrer">{attachment.file_name}</a>
            </p>
          )}
        </div>
      )}
      {canRemove && (
        <div style={{ marginTop: "var(--space-xs)" }}>
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="btn btn-secondary"
            style={{ fontSize: "0.875rem", padding: "var(--space-2xs) var(--space-sm)", color: "var(--color-error, #b91c1c)" }}
            aria-label={`Remove ${attachment.file_name ?? "attachment"}`}
          >
            {removing ? "Removing…" : "Remove"}
          </button>
        </div>
      )}
      {error && (
        <p className="form-note" style={{ color: "var(--color-error, #b91c1c)", marginTop: "var(--space-2xs)" }} role="alert">
          {error}
        </p>
      )}
    </li>
  );
}
