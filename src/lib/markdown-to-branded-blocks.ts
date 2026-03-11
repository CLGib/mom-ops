/**
 * Parse simple markdown into BrandedDocBlock[] for the docx builder.
 */

import type { BrandedDocBlock, BrandedDocInput } from "./build-branded-docx";

function trimLines(s: string): string {
  return s.replace(/^\s+|\s+$/g, "");
}

/**
 * Parse markdown string into structured blocks and extract title.
 * Handles: # title, ##, ###, -, *, 1., ---, > callout, markdown tables.
 */
export function markdownToBrandedDocInput(
  markdown: string,
  options?: { preparedBy?: string; preparedFor?: string; date?: string }
): BrandedDocInput {
  const lines = markdown.split(/\r?\n/);
  let title = "Document";
  const blocks: BrandedDocBlock[] = [];
  let i = 0;

  // First line: # Title
  const h1Match = lines[0]?.match(/^#\s+(.+)$/);
  if (h1Match) {
    title = trimLines(h1Match[1]);
    i = 1;
  } else if (lines[0]?.trim()) {
    title = trimLines(lines[0]);
    i = 1;
  }

  const bulletItems: string[] = [];
  const numberedItems: string[] = [];
  let inBulletList = false;
  let inNumberedList = false;

  function flushBulletList() {
    if (bulletItems.length > 0) {
      blocks.push({ type: "bulletList", items: [...bulletItems] });
      bulletItems.length = 0;
    }
    inBulletList = false;
  }
  function flushNumberedList() {
    if (numberedItems.length > 0) {
      blocks.push({ type: "numberedList", items: [...numberedItems] });
      numberedItems.length = 0;
    }
    inNumberedList = false;
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line?.trim() ?? "";

    if (trimmed === "" || trimmed === "---") {
      flushBulletList();
      flushNumberedList();
      if (trimmed === "---") {
        blocks.push({ type: "rule" });
      }
      i++;
      continue;
    }

    // Table: lines with |
    if (trimmed.includes("|")) {
      flushBulletList();
      flushNumberedList();
      const tableLines: string[][] = [];
      while (i < lines.length && lines[i]?.includes("|")) {
        const cells = lines[i]!.split("|").map((c) => trimLines(c));
        const contentCells = cells.filter((c) => c.length > 0);
        if (contentCells.length > 0) tableLines.push(contentCells);
        i++;
      }
      const isSep = (row: string[]) => row.every((c) => /^[-:\s]+$/.test(c));
      const first = tableLines[0];
      const skipSep = first && isSep(first);
      const headers = (skipSep ? tableLines[1] : tableLines[0]) ?? [];
      const rows = skipSep ? tableLines.slice(2) : tableLines.slice(1);
      if (headers.length > 0) {
        blocks.push({ type: "table", headers, rows });
      }
      continue;
    }

    // ## Heading 2
    const h2 = trimmed.match(/^##\s+(.+)$/);
    if (h2) {
      flushBulletList();
      flushNumberedList();
      blocks.push({ type: "heading2", text: trimLines(h2[1]) });
      i++;
      continue;
    }

    // ### Heading 3
    const h3 = trimmed.match(/^###\s+(.+)$/);
    if (h3) {
      flushBulletList();
      flushNumberedList();
      blocks.push({ type: "heading3", text: trimLines(h3[1]) });
      i++;
      continue;
    }

    // > Callout
    const calloutMatch = trimmed.match(/^>\s*\*?\*?(NOTE|TIP|SUCCESS|KEY POINT):?\*?\*?\s*(.*)$/i);
    if (trimmed.startsWith(">")) {
      flushBulletList();
      flushNumberedList();
      const labelMatch = trimmed.match(/^>\s*\*?\*?([A-Za-z\s]+):?\*?\*?\s*(.*)$/);
      const label = labelMatch ? trimLines(labelMatch[1]) : undefined;
      const text = labelMatch ? trimLines(labelMatch[2]) : trimLines(trimmed.slice(1));
      blocks.push({
        type: "callout",
        label: label || undefined,
        text: text || trimmed.slice(1).trim(),
        variant: /success|tip/i.test(label ?? "") ? "success" : "note",
      });
      i++;
      continue;
    }

    // Bullet: - or *
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushNumberedList();
      inBulletList = true;
      bulletItems.push(trimLines(bulletMatch[1]));
      i++;
      continue;
    }

    // Numbered: 1. 2.
    const numMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numMatch) {
      flushBulletList();
      inNumberedList = true;
      numberedItems.push(trimLines(numMatch[1]));
      i++;
      continue;
    }

    flushBulletList();
    flushNumberedList();
    blocks.push({ type: "paragraph", content: trimmed });
    i++;
  }

  flushBulletList();
  flushNumberedList();

  return {
    title,
    preparedBy: options?.preparedBy,
    preparedFor: options?.preparedFor,
    date: options?.date,
    blocks,
  };
}
