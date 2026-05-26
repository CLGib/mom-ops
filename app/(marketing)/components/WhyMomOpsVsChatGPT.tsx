const DIY_STACK = [
  "Claude Pro — ~$200/month",
  "ChatGPT Plus — ~$20/month",
  "Gemini Advanced — ~$20/month",
  "Automation tools and integrations",
  "Prompt engineering for every task",
  "Memory and context to keep it all consistent",
  "Hours of setup, testing, and maintenance",
];

const MOMOPS_STACK = [
  "One membership",
  "A library of family-ready helpers, already built",
  "Household memory built in",
  "Optional human support when you want it",
  "Nothing to set up",
];

export default function WhyMomOpsVsChatGPT() {
  return (
    <section id="why-mom-ops" className="section">
      <div className="container container--wide">
        <h2 className="section-title">
          You could build this yourself with ChatGPT.
        </h2>
        <p className="section-lead">
          You can also build your own car. Most people don&apos;t, because
          someone already did the work.
        </p>
        <div
          style={{
            display: "grid",
            gap: "var(--space-lg)",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            marginTop: "var(--space-lg)",
          }}
        >
          <article className="card">
            <h3
              className="credits-card-title"
              style={{ marginBottom: "var(--space-xs)" }}
            >
              The DIY path
            </h3>
            <p
              className="section-body section-body--tight"
              style={{ marginBottom: "var(--space-sm)" }}
            >
              What you&apos;d need to assemble yourself:
            </p>
            <ul
              style={{
                listStyle: "disc",
                paddingLeft: "1.25rem",
                margin: 0,
                color: "var(--text-muted)",
                lineHeight: 1.7,
              }}
            >
              {DIY_STACK.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p
              className="section-body section-body--tight"
              style={{ marginTop: "var(--space-md)", fontWeight: 600 }}
            >
              Roughly $240+/month, plus a second job.
            </p>
          </article>

          <article className="card card--highlight">
            <h3
              className="credits-card-title"
              style={{ marginBottom: "var(--space-xs)" }}
            >
              Mom Ops
            </h3>
            <p
              className="section-body section-body--tight"
              style={{ marginBottom: "var(--space-sm)" }}
            >
              What you actually get:
            </p>
            <ul
              style={{
                listStyle: "disc",
                paddingLeft: "1.25rem",
                margin: 0,
                color: "var(--text-muted)",
                lineHeight: 1.7,
              }}
            >
              {MOMOPS_STACK.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p
              className="section-body section-body--tight"
              style={{ marginTop: "var(--space-md)", fontWeight: 600 }}
            >
              $29.95/month. One membership. The family-ready system, already
              built.
            </p>
          </article>
        </div>
        <p
          className="section-body"
          style={{
            marginTop: "var(--space-lg)",
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          We did the work so you don&apos;t have to.
        </p>
      </div>
    </section>
  );
}
