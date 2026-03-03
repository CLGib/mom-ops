/**
 * Validation for feedback attachment_url to prevent XSS and open redirects.
 * Only allow URLs that point to our Supabase storage feedback-attachments bucket.
 */

const DANGEROUS_SCHEMES = ["javascript:", "data:", "vbscript:", "file:"];
const BUCKET_PATH = "/storage/v1/object/public/feedback-attachments";

/** Returns the allowed base URL for feedback attachment URLs (no trailing slash). */
export function getFeedbackAttachmentBaseUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}${BUCKET_PATH}`;
}

/**
 * Returns true if url is safe to use as href or img src: same-origin storage URL only.
 * Rejects javascript:, data:, vbscript:, and any off-site URL.
 */
export function isAllowedFeedbackAttachmentUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (DANGEROUS_SCHEMES.some((s) => lower.startsWith(s))) return false;
  const base = getFeedbackAttachmentBaseUrl();
  if (!base) return false;
  return trimmed.startsWith(base);
}

/**
 * Validates attachment_url from API request. Returns null if invalid or not allowed.
 * Use this server-side when accepting user input.
 */
export function validateFeedbackAttachmentUrl(input: string | null | undefined): string | null {
  if (input == null || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (DANGEROUS_SCHEMES.some((s) => trimmed.toLowerCase().startsWith(s))) return null;
  const base = getFeedbackAttachmentBaseUrl();
  if (!base) return null;
  if (!trimmed.startsWith(base)) return null;
  return trimmed;
}
