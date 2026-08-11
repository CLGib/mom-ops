import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../(marketing)/components/SiteHeader";
import SiteFooter from "../../(marketing)/components/SiteFooter";
import NewsletterSignup from "../../(marketing)/components/NewsletterSignup";
import { getAllNotes, getNoteBySlug } from "@/lib/notes";

export function generateStaticParams() {
  return getAllNotes().map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const note = await getNoteBySlug(slug);
  if (!note) return { title: "The Notebook · Mom Ops" };
  return { title: `${note.title} · Mom Ops`, description: note.summary };
}

function formatDate(d: string): string {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, day || 1));
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = await getNoteBySlug(slug);
  if (!note) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <article className="section">
          <div className="container" style={{ maxWidth: 720 }}>
            <Link href="/notes" className="back-link">
              ← The Notebook
            </Link>
            <p className="note-article-meta">
              <span className={`note-type note-type--${note.type}`}>{note.type}</span>
              <span>{formatDate(note.date)}</span>
            </p>
            <h1 className="note-article-title">{note.title}</h1>

            <div className="prose" dangerouslySetInnerHTML={{ __html: note.html }} />

            <div className="note-article-cta card card--highlight">
              {note.type === "skill" && note.product ? (
                <>
                  <h2 className="section-heading">Want the done-for-you version?</h2>
                  <p className="section-body" style={{ marginBottom: "var(--space-md)" }}>
                    Skip the build and grab the kit, customized to you.
                  </p>
                  <Link href={`/kits/${note.product}`} className="btn btn-primary">
                    See the kit
                  </Link>
                </>
              ) : (
                <>
                  <h2 className="section-heading">Follow along</h2>
                  <p className="section-body" style={{ marginBottom: "var(--space-md)" }}>
                    One email a week. One thing I&apos;m building, one thing I learned.
                    Notes from the workshop. Easy unsubscribe, always.
                  </p>
                  <NewsletterSignup source={`note:${note.slug}`} />
                </>
              )}
            </div>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
