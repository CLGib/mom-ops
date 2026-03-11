/**
 * Extract YouTube video ID from common URL formats.
 * Returns null if not a recognized YouTube URL.
 */
export function getYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?|$)/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/watch?v=VIDEO_ID or youtube.com/embed/VIDEO_ID
  const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?.*v=|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  return null;
}

/**
 * Convert a YouTube URL to the embed URL for iframe src.
 * Returns null if the URL is not valid for embedding.
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}`;
}
