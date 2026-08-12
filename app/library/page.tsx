import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../(marketing)/components/SiteHeader";
import SiteFooter from "../(marketing)/components/SiteFooter";
import { getAllBooks } from "@/lib/books";

export const metadata: Metadata = {
  title: "The Library · Mom Ops",
  description: "Books I've read, what I actually gained from them, and whether they're worth your time.",
};

function stars(rating: number): string {
  const full = Math.round(rating);
  return "★★★★★☆☆☆☆☆".slice(5 - full, 10 - full);
}

export default function LibraryPage() {
  const books = getAllBooks();
  return (
    <>
      <SiteHeader />
      <main>
        <section className="section">
          <div className="container">
            <h1 className="section-title">The Library</h1>
            <p className="section-lead">
              Books I've actually read, what I gained from each one, and whether it's
              worth your time. No affiliate-link book lists. Just honest notes.
            </p>
            {books.length === 0 ? (
              <p className="form-note" style={{ marginTop: "var(--space-lg)" }}>
                First review coming soon.
              </p>
            ) : (
              <ul className="notes-list">
                {books.map((b) => (
                  <li key={b.slug}>
                    <Link href={`/library/${b.slug}`} className="note-row">
                      <span className="note-row-meta">
                        <span aria-label={`${b.rating} out of 5`} style={{ color: "var(--accent)" }}>
                          {stars(b.rating)}
                        </span>
                      </span>
                      <span className="note-row-title">{b.title}</span>
                      {b.author && (
                        <span className="note-row-summary" style={{ fontStyle: "italic" }}>
                          {b.author}
                        </span>
                      )}
                      {b.takeaway && <span className="note-row-summary">{b.takeaway}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
