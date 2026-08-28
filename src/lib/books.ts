import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

/**
 * The Library: books Chrissy has read, with her review and what she gained.
 * Authored as markdown files in content/books/*.md (same pattern as notes).
 */

export type BookMeta = {
  slug: string;
  title: string;
  author: string;
  /** 0-5. */
  rating: number;
  /** YYYY-MM-DD when finished. */
  dateRead: string;
  /** One-line takeaway shown on cards. */
  takeaway: string;
  /** Amazon product id (10 chars, from the product URL /dp/XXXXXXXXXX). Optional. */
  asin?: string;
  published: boolean;
};

/** Amazon Associates tag. Set AMAZON_ASSOCIATES_TAG in the environment once you join. */
const AMAZON_ASSOCIATES_TAG = process.env.AMAZON_ASSOCIATES_TAG ?? "";

/**
 * Build an Amazon link for a book. When AMAZON_ASSOCIATES_TAG is set, the
 * affiliate tag is appended so qualifying purchases earn a commission. Returns
 * null when the book has no valid ASIN.
 */
export function amazonAffiliateUrl(asin?: string): string | null {
  if (!asin) return null;
  const clean = asin.trim();
  if (!/^[A-Z0-9]{10}$/i.test(clean)) return null;
  const url = `https://www.amazon.com/dp/${clean}`;
  return AMAZON_ASSOCIATES_TAG ? `${url}?tag=${encodeURIComponent(AMAZON_ASSOCIATES_TAG)}` : url;
}

export type Book = BookMeta & { html: string };

const BOOKS_DIR = path.join(process.cwd(), "content", "books");

function readRaw(): { slug: string; data: matter.GrayMatterFile<string> }[] {
  let files: string[] = [];
  try {
    files = fs.readdirSync(BOOKS_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  return files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(BOOKS_DIR, file), "utf8");
    return { slug, data: matter(raw) };
  });
}

function toMeta(slug: string, fm: Record<string, unknown>): BookMeta {
  const ratingNum = Number(fm.rating);
  return {
    slug,
    title: String(fm.title ?? slug),
    author: String(fm.author ?? ""),
    rating: Number.isFinite(ratingNum) ? Math.max(0, Math.min(5, ratingNum)) : 0,
    dateRead: String(fm.dateRead ?? ""),
    takeaway: String(fm.takeaway ?? ""),
    asin: fm.asin != null && String(fm.asin).trim() ? String(fm.asin).trim() : undefined,
    published: fm.published !== false,
  };
}

/** Published books, newest read first. */
export function getAllBooks(): BookMeta[] {
  return readRaw()
    .map(({ slug, data }) => toMeta(slug, data.data))
    .filter((b) => b.published)
    .sort((a, b) => (a.dateRead < b.dateRead ? 1 : a.dateRead > b.dateRead ? -1 : 0));
}

export async function getBookBySlug(slug: string): Promise<Book | null> {
  const entry = readRaw().find((e) => e.slug === slug);
  if (!entry) return null;
  const meta = toMeta(slug, entry.data.data);
  if (!meta.published) return null;
  const html = await marked.parse(entry.data.content);
  return { ...meta, html };
}
