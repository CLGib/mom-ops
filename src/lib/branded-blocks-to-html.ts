import type { BrandedDocBlock } from "./build-branded-docx";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render structured branded blocks to a safe HTML string for on-page preview.
 * All text is escaped (blocks originate from AI markdown, so never trust raw HTML).
 */
export function brandedBlocksToHtml(blocks: BrandedDocBlock[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "heading2":
        out.push(`<h2 class="kit-doc-h2">${esc(b.text)}</h2>`);
        break;
      case "heading3":
        out.push(`<h3 class="kit-doc-h3">${esc(b.text)}</h3>`);
        break;
      case "paragraph":
        out.push(`<p>${esc(b.content)}</p>`);
        break;
      case "bulletList":
        out.push(`<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`);
        break;
      case "numberedList":
        out.push(`<ol>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ol>`);
        break;
      case "table":
        out.push(
          `<div class="kit-doc-table-wrap"><table class="kit-doc-table"><thead><tr>${b.headers
            .map((h) => `<th>${esc(h)}</th>`)
            .join("")}</tr></thead><tbody>${b.rows
            .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table></div>`
        );
        break;
      case "callout":
        out.push(
          `<div class="kit-doc-callout kit-doc-callout--${b.variant ?? "note"}">${
            b.label ? `<strong>${esc(b.label)}:</strong> ` : ""
          }${esc(b.text)}</div>`
        );
        break;
      case "rule":
        out.push(`<hr class="kit-doc-rule" />`);
        break;
    }
  }
  return out.join("\n");
}
