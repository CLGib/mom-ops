const ALLOWED_TAGS = new Set(["p", "br", "strong", "em", "b", "i", "ul", "ol", "li", "a"]);

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

/**
 * Sanitize HTML for safe display. Allows only p, br, strong, em, b, i, ul, ol, li, a (with safe href).
 */
export function sanitizeHtml(html: string): string {
  return html.replace(/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\s*([^>]*)>/g, (_, close, tagName, attrs) => {
    const tag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (close) return `</${tag}>`;
    if (tag === "br") return "<br/>";
    const a = tag === "a" ? safeHref(attrs) : "";
    return `<${tag}${a}>`;
  });
}

/** Sanitize message for display: if it contains tags, sanitize HTML; else escape and turn newlines into <br/>. */
export function sanitizeMessageBody(message: string): string {
  if (!message.trim()) return "";
  if (!/<[a-zA-Z]/.test(message)) return escapeHtml(message).replace(/\n/g, "<br/>");
  return sanitizeHtml(message);
}
