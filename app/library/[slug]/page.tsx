import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../(marketing)/components/SiteHeader";
import SiteFooter from "../../(marketing)/components/SiteFooter";
import NewsletterSignup from "../../(marketing)/components/NewsletterSignup";
import { getAllBooks, getBookBySlug } from "@/lib/books";

export function generateStaticParams() {
  return getAllBooks().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) return { title: "The Library · Mom Ops" };
  return { title: `${book.title} · The Library · Mom Ops`, description: book.takeaway };
}

function stars(rating: number): string {
  const full = Math.round(rating);
  return "★★★★★☆☆☆☆☆".slice(5 - full, 10 - full);
}

function formatDate(d: string): string {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, day || 1));
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <article className="section">
          <div className="container" style={{ maxWidth: 720 }}>
            <Link href="/library" className="back-link">
              ← The Library
            </Link>
            <p className="note-article-meta">
              <span aria-label={`${book.rating} out of 5`} style={{ color: "var(--accent)" }}>
                {stars(book.rating)}
              </span>
              {book.dateRead && <span>Read {formatDate(book.dateRead)}</span>}
            </p>
            <h1 className="note-article-title" style={{ marginBottom: "var(--space-xs)" }}>
              {book.title}
            </h1>
            {book.author && (
              <p className="section-lead" style={{ fontStyle: "italic", marginTop: 0 }}>
                {book.author}
              </p>
            )}

            <div className="prose" dangerouslySetInnerHTML={{ __html: book.html }} />

            <div className="note-article-cta card card--highlight">
              <h2 className="section-heading">Get the next one</h2>
              <p className="section-body" style={{ marginBottom: "var(--space-md)" }}>
                I share what I'm reading (and building) once a week. Notes from the workshop.
              </p>
              <NewsletterSignup source={`book:${book.slug}`} />
            </div>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
