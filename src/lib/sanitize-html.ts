const ALLOWED_TAGS = new Set(["p", "br", "strong", "em", "b", "i", "ul", "ol", "li", "a", "span"]);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeHref(attrs: string): string {
  const m = /href\s*=\s*["']([^"']+)["']/i.exec(attrs);
  const href = m?.[1]?.trim();
  if (!href || !/^(\/|https?:\/\/|mailto:)/i.test(href)) return "";
  return ` href="${escapeHtml(href)}"`;
}

/** Allow only data-mention-user-id (UUID) and class="mention" for VA @mentions. */
function safeMentionAttrs(attrs: string): string {
  const idM = /data-mention-user-id\s*=\s*["']([^"']+)["']/i.exec(attrs);
  const userId = idM?.[1]?.trim();
  if (!userId || !UUID_REGEX.test(userId)) return "";
  return ` class="mention" data-mention-user-id="${escapeHtml(userId)}"`;
}

/**
 * Sanitize HTML for safe display. Allows only p, br, strong, em, b, i, ul, ol, li, a (with safe href).
 */
export function sanitizeHtml(html: string): string {
  return html.replace(/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\s*([^>]*)>/g, (_, close, tagName, attrs) => {
    const tag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (close) return `</${tag}>`;
    if (tag === "br") return "<br/>";
    if (tag === "a") return `<a${safeHref(attrs)}>`;
    if (tag === "span") return `<span${safeMentionAttrs(attrs)}>`;
    return `<${tag}>`;
  });
}

/** Turn plain URLs in text into <a> tags. Escapes non-URL parts. */
function linkifyUrls(text: string): string {
  const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
  const parts: string[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = urlRegex.exec(text)) !== null) {
    parts.push(escapeHtml(text.slice(lastIndex, m.index)));
    const url = m[1];
    const escapedUrl = escapeHtml(url);
    parts.push(`<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${escapedUrl}</a>`);
    lastIndex = m.index + url.length;
  }
  parts.push(escapeHtml(text.slice(lastIndex)));
  return parts.join("");
}

/** Sanitize message for display: if it contains tags, sanitize HTML; else escape, linkify URLs, and turn newlines into <br/>. */
export function sanitizeMessageBody(message: string | null | undefined): string {
  const s = message == null ? "" : String(message);
  if (!s.trim()) return "";
  if (!/<[a-zA-Z]/.test(s)) return linkifyUrls(s).replace(/\n/g, "<br/>");
  return sanitizeHtml(s);
}
