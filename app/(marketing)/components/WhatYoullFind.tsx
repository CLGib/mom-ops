const FINDS = [
  "The prompts",
  "The mistakes",
  "The AI workflows",
  "The marketing experiments",
  "The websites",
  "The automations",
  "The systems",
  "The launches",
  "The wins",
  "The spectacular failures",
];

export default function WhatYoullFind() {
  return (
    <section className="section">
      <div className="container">
        <h2 className="section-title">What you&apos;ll find here</h2>
        <p className="section-lead">
          Not courses. Not gurus. Not hustle culture. Just honest breakdowns of
          how I actually build things.
        </p>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "var(--space-lg) 0",
            display: "grid",
            gap: "var(--space-xs)",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          {FINDS.map((f) => (
            <li
              key={f}
              style={{
                padding: "var(--space-xs) 0",
                borderBottom: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              {f}
            </li>
          ))}
        </ul>
        <div style={{ maxWidth: "56ch" }}>
          <p className="section-body">
            If something saves me ten hours&hellip; I&apos;ll show you.
          </p>
          <p className="section-body">
            If something makes me money&hellip; I&apos;ll explain exactly how.
          </p>
          <p className="section-body">
            If something completely flops&hellip; you&apos;ll hear about that too.
          </p>
        </div>
      </div>
    </section>
  );
}
