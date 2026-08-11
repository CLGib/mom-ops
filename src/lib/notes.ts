import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

/**
 * The Notebook: Chrissy's weekly content, authored as markdown files in
 * content/notes/*.md. First-party content (she writes it in the repo), so the
 * markdown is rendered directly.
 *
 * Two content types:
 *  - "study"  → an information share / story; ends in a newsletter CTA.
 *  - "skill"  → a how-to tied to a micro-product; can link to a kit via `product`.
 */

export type NoteType = "study" | "skill";

export type NoteMeta = {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: NoteType;
  summary: string;
  published: boolean;
  /** For "skill" notes: slug of the related kit/product, if any. */
  product?: string;
  /** Optional YouTube URL to embed at the top of the piece. */
  youtubeUrl?: string;
};

export type Note = NoteMeta & { html: string };

const NOTES_DIR = path.join(process.cwd(), "content", "notes");

function readRaw(): { file: string; slug: string; data: matter.GrayMatterFile<string> }[] {
  let files: string[] = [];
  try {
    files = fs.readdirSync(NOTES_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  return files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(NOTES_DIR, file), "utf8");
    return { file, slug, data: matter(raw) };
  });
}

function toMeta(slug: string, fm: Record<string, unknown>): NoteMeta {
  return {
    slug,
    title: String(fm.title ?? slug),
    date: String(fm.date ?? ""),
    type: (fm.type === "skill" ? "skill" : "study") as NoteType,
    summary: String(fm.summary ?? ""),
    published: fm.published !== false,
    product: fm.product != null ? String(fm.product) : undefined,
    youtubeUrl: fm.youtubeUrl != null ? String(fm.youtubeUrl) : undefined,
  };
}

/** Published notes, newest first (metadata only). */
export function getAllNotes(): NoteMeta[] {
  return readRaw()
    .map(({ slug, data }) => toMeta(slug, data.data))
    .filter((n) => n.published)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** Full note (with rendered HTML) by slug, or null. */
export async function getNoteBySlug(slug: string): Promise<Note | null> {
  const entry = readRaw().find((e) => e.slug === slug);
  if (!entry) return null;
  const meta = toMeta(slug, entry.data.data);
  if (!meta.published) return null;
  const html = await marked.parse(entry.data.content);
  return { ...meta, html };
}
