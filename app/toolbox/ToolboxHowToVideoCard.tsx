"use client";

import Link from "next/link";
import YouTubeEmbed from "../components/YouTubeEmbed";

export type HowToVideoRecord = {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  task_category: string | null;
  example_ticket_id: string | null;
  example_ticket_number?: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type Props = {
  video: HowToVideoRecord;
  canManage: boolean;
  onEdit?: (video: HowToVideoRecord) => void;
  onDelete?: (id: string) => void;
};

export default function ToolboxHowToVideoCard({ video, canManage, onEdit, onDelete }: Props) {
  return (
    <article
      style={{
        marginBottom: "var(--space-lg)",
        border: "1px solid var(--color-border, #e5e5e5)",
        borderRadius: "var(--radius, 6px)",
        overflow: "hidden",
        backgroundColor: "var(--color-surface, #fff)",
      }}
    >
      <div style={{ padding: "var(--space-md)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-md)", marginBottom: "var(--space-sm)" }}>
          <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>{video.title}</h3>
          {canManage && (onEdit || onDelete) && (
            <div style={{ display: "flex", gap: "var(--space-xs)", flexShrink: 0 }}>
              {onEdit && (
                <button type="button" onClick={() => onEdit(video)} className="btn btn-secondary" style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }}>
                  Edit
                </button>
              )}
              {onDelete && (
                <button type="button" onClick={() => onDelete(video.id)} className="btn" style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }}>
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
        {video.task_category && (
          <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
            Category: {video.task_category}
          </p>
        )}
        {video.description ? (
          <p style={{ whiteSpace: "pre-wrap", marginBottom: "var(--space-md)", lineHeight: 1.5, fontSize: "0.9375rem" }}>
            {video.description}
          </p>
        ) : null}
        <div style={{ marginBottom: "var(--space-md)", maxWidth: "640px" }}>
          <YouTubeEmbed youtubeUrl={video.youtube_url} title={video.title} />
        </div>
        {video.example_ticket_id && (
          <p style={{ margin: 0, fontSize: "0.9375rem" }}>
            <Link href={`/va/${video.example_ticket_id}`} className="link">
              {video.example_ticket_number != null
                ? `See Ticket #${video.example_ticket_number} for full details →`
                : "See ticket for full details →"}
            </Link>
          </p>
        )}
      </div>
    </article>
  );
}
