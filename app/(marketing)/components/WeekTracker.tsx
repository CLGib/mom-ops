import { getAllNotes } from "@/lib/notes";

const TOTAL = 100;

/**
 * Public progress tracker for the 100-week content bet.
 * Auto-counts from published notes, so it climbs itself each week.
 * `bare` renders just the card (no section wrapper) for embedding.
 */
export default function WeekTracker({ bare = false }: { bare?: boolean }) {
  const done = getAllNotes().length;
  const pct = Math.max(1, Math.min(100, Math.round((done / TOTAL) * 100)));

  const card = (
    <div className="week-tracker card">
      <div className="week-tracker-top">
        <span className="eyebrow" style={{ margin: 0 }}>The 100-week bet</span>
        <span className="week-tracker-count">
          <strong>Week {done}</strong> of {TOTAL}
        </span>
      </div>
      <div
        className="week-tracker-bar"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={TOTAL}
        aria-label={`Week ${done} of ${TOTAL}`}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="form-note" style={{ marginTop: "var(--space-sm)", marginBottom: 0 }}>
        One meaningful piece a week, every week.{" "}
        {done <= 1 ? "Just getting started." : `${done} down, ${TOTAL - done} to go.`}
      </p>
    </div>
  );

  if (bare) return card;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 620 }}>{card}</div>
    </section>
  );
}
