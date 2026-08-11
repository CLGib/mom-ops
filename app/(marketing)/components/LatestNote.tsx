import Link from "next/link";
import { getAllNotes } from "@/lib/notes";

function formatDate(d: string): string {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, day || 1));
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default function LatestNote() {
  const notes = getAllNotes();
  if (notes.length === 0) return null;
  const latest = notes[0];
  return (
    <section className="section section-alt">
      <div className="container">
        <p className="eyebrow">Latest from the notebook</p>
        <Link href={`/notes/${latest.slug}`} className="latest-note card">
          <span className="latest-note-meta">
            <span className={`note-type note-type--${latest.type}`}>{latest.type}</span>
            <span>{formatDate(latest.date)}</span>
          </span>
          <h2 className="latest-note-title">{latest.title}</h2>
          {latest.summary && <p className="latest-note-summary">{latest.summary}</p>}
          <span className="latest-note-cta">Read it →</span>
        </Link>
        {notes.length > 1 && (
          <p style={{ marginTop: "var(--space-md)" }}>
            <Link href="/notes" className="btn btn-secondary">
              Browse the notebook
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
