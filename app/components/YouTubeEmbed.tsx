"use client";

import { getYouTubeEmbedUrl } from "@/lib/youtube";

type Props = {
  youtubeUrl: string;
  title?: string;
  /** Aspect ratio: "16/9" (default) or "4/3" */
  aspectRatio?: "16/9" | "4/3";
  className?: string;
};

const RATIO_STYLES: Record<string, { paddingBottom: string }> = {
  "16/9": { paddingBottom: "56.25%" },
  "4/3": { paddingBottom: "75%" },
};

export default function YouTubeEmbed({ youtubeUrl, title = "YouTube video", aspectRatio = "16/9", className }: Props) {
  const embedUrl = getYouTubeEmbedUrl(youtubeUrl);

  if (!embedUrl) {
    return (
      <div
        className={className}
        style={{
          padding: "var(--space-md)",
          backgroundColor: "var(--color-muted-bg, #f5f5f5)",
          borderRadius: "var(--radius, 6px)",
          color: "var(--text-muted, #666)",
          fontSize: "0.875rem",
        }}
      >
        Invalid or unsupported video URL. Use a YouTube link (e.g. youtube.com/watch?v=... or youtu.be/...).
      </div>
    );
  }

  const ratioStyle = RATIO_STYLES[aspectRatio] ?? RATIO_STYLES["16/9"];

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        ...ratioStyle,
        borderRadius: "var(--radius, 6px)",
        overflow: "hidden",
        backgroundColor: "#000",
      }}
    >
      <iframe
        src={embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          border: 0,
        }}
      />
    </div>
  );
}
