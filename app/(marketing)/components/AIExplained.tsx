const TERMS = [
  {
    term: "Prompt",
    def: "Instructions that guide the AI. You don’t write them — we already did.",
  },
  {
    term: "Playbook",
    def: "A repeatable system for a common family task. Run it once or run it every week.",
  },
  {
    term: "Agent",
    def: "A specialized AI helper focused on one category of work, like school or travel.",
  },
];

export default function AIExplained() {
  return (
    <section id="ai-explained" className="section section-alt">
      <div className="container">
        <h2 className="section-title">AI, explained simply.</h2>
        <p className="section-lead">
          You don&apos;t need to learn how any of this works. But if you&apos;re
          curious, here&apos;s the whole vocabulary in three lines.
        </p>
        <div
          className="credits-card-grid"
          style={{ marginTop: "var(--space-lg)" }}
        >
          {TERMS.map((t) => (
            <article key={t.term} className="credits-card">
              <h3 className="credits-card-title">{t.term}</h3>
              <p className="credits-card-description">{t.def}</p>
            </article>
          ))}
        </div>
        <p
          className="section-body"
          style={{ marginTop: "var(--space-lg)", textAlign: "center" }}
        >
          Mom Ops is the system that puts these together for your family.
        </p>
      </div>
    </section>
  );
}
