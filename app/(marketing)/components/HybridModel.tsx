export default function HybridModel() {
  return (
    <section id="hybrid" className="section">
      <div className="container">
        <h2 className="section-title">AI-first. Human-supported.</h2>
        <p className="section-lead">
          The AI handles the planning, drafting, organizing, and follow-through.
          A real person handles the parts that need a human touch.
        </p>
        <div
          style={{
            display: "grid",
            gap: "var(--space-md)",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            marginTop: "var(--space-lg)",
          }}
        >
          <article className="credits-card">
            <h3 className="credits-card-title">What the system does</h3>
            <p className="credits-card-description">
              Picks the right playbook. Pulls in what it already knows about
              your family. Produces a draft, plan, or recommendation. Stays
              consistent across requests.
            </p>
          </article>
          <article className="credits-card">
            <h3 className="credits-card-title">Where a human steps in</h3>
            <p className="credits-card-description">
              Refinement, coordination, accountability, emotional nuance,
              edge cases. White-glove support when a draft needs a real
              second pair of eyes.
            </p>
          </article>
        </div>
        <p
          className="section-body"
          style={{
            marginTop: "var(--space-lg)",
            textAlign: "center",
            color: "var(--text-muted)",
            fontStyle: "italic",
          }}
        >
          You never have to choose. Use as much of either as you need.
        </p>
      </div>
    </section>
  );
}
