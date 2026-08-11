import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../(marketing)/components/SiteHeader";
import SiteFooter from "../(marketing)/components/SiteFooter";
import WeekTracker from "../(marketing)/components/WeekTracker";
import { getAllNotes } from "@/lib/notes";

export const metadata: Metadata = {
  title: "The Notebook · Mom Ops",
  description:
    "Studies, stories, and skills from a curious mom building in public. One meaningful piece a week.",
};

function formatDate(d: string): string {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, day || 1));
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default function NotesPage() {
  const notes = getAllNotes();
  return (
    <>
      <SiteHeader />
      <main>
        <section className="section">
          <div className="container">
            <h1 className="section-title">The Notebook</h1>
            <p className="section-lead">
              Studies, stories, and skills from the workshop. One meaningful piece a
              week. Some will be useful. Some will be me thinking out loud. You get
              to watch either way.
            </p>
            <div style={{ maxWidth: 620, marginTop: "var(--space-lg)" }}>
              <WeekTracker bare />
            </div>
            {notes.length === 0 ? (
              <p className="form-note">The first piece drops soon.</p>
            ) : (
              <ul className="notes-list">
                {notes.map((n) => (
                  <li key={n.slug}>
                    <Link href={`/notes/${n.slug}`} className="note-row">
                      <span className="note-row-meta">
                        <span className={`note-type note-type--${n.type}`}>{n.type}</span>
                        <span className="note-row-date">{formatDate(n.date)}</span>
                      </span>
                      <span className="note-row-title">{n.title}</span>
                      {n.summary && <span className="note-row-summary">{n.summary}</span>}
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
