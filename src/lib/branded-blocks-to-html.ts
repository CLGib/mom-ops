import type { BrandedDocBlock } from "./build-branded-docx";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Escape HTML, then convert a safe subset of inline markdown to HTML:
 * **bold**, *italic*, _italic_, `code`, and [text](http(s)/mailto url).
 * Escaping happens first, so the markdown tokens (*, _, `, [], ()) are the
 * only thing we ever turn into tags. Links are restricted to safe schemes.
 */
function inline(s: string): string {
  let t = esc(s);
  // Links: [text](url) — only http(s) and mailto, so no javascript: injection.
  t = t.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    (_m, text: string, url: string) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`
  );
  // Bold before italic so ** is consumed first.
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*(.+?)\*/g, "<em>$1</em>");
  t = t.replace(/_(.+?)_/g, "<em>$1</em>");
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  return t;
}

/**
 * Render structured branded blocks to a safe HTML string for on-page preview.
 * Text is escaped (blocks originate from AI markdown, so never trust raw HTML),
 * then a safe subset of inline markdown is rendered.
 */
export function brandedBlocksToHtml(blocks: BrandedDocBlock[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "heading2":
        out.push(`<h2 class="kit-doc-h2">${inline(b.text)}</h2>`);
        break;
      case "heading3":
        out.push(`<h3 class="kit-doc-h3">${inline(b.text)}</h3>`);
        break;
      case "paragraph":
        out.push(`<p>${inline(b.content)}</p>`);
        break;
      case "bulletList":
        out.push(`<ul>${b.items.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`);
        break;
      case "numberedList":
        out.push(`<ol>${b.items.map((i) => `<li>${inline(i)}</li>`).join("")}</ol>`);
        break;
      case "table":
        out.push(
          `<div class="kit-doc-table-wrap"><table class="kit-doc-table"><thead><tr>${b.headers
            .map((h) => `<th>${inline(h)}</th>`)
            .join("")}</tr></thead><tbody>${b.rows
            .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table></div>`
        );
        break;
      case "callout":
        out.push(
          `<div class="kit-doc-callout kit-doc-callout--${b.variant ?? "note"}">${
            b.label ? `<strong>${esc(b.label)}:</strong> ` : ""
          }${inline(b.text)}</div>`
        );
        break;
      case "rule":
        out.push(`<hr class="kit-doc-rule" />`);
        break;
    }
  }
  return out.join("\n");
}
