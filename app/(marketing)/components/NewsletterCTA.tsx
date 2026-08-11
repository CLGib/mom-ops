import NewsletterSignup from "./NewsletterSignup";

const PROMISES = [
  "One thing I'm building",
  "One thing I learned",
  "One AI trick",
  "One mistake",
  "One shortcut",
];

export default function NewsletterCTA() {
  return (
    <section id="newsletter" className="section cta-section">
      <div className="container">
        <h2 className="section-title">Want my latest experiment?</h2>
        <p className="section-lead">
          Every week I send one email. Just notes from the workshop.
        </p>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "var(--space-md) auto var(--space-lg)",
            maxWidth: "32ch",
            textAlign: "left",
            display: "grid",
            gap: "var(--space-2xs)",
            color: "var(--text-muted)",
          }}
        >
          {PROMISES.map((p) => (
            <li key={p}>· {p}</li>
          ))}
        </ul>
        <p className="section-body" style={{ marginBottom: "var(--space-lg)" }}>
          No fluff. No gurus. No pretending I have life figured out.
        </p>
        <NewsletterSignup source="newsletter-section" />
        <p
          className="form-note"
          style={{ marginTop: "var(--space-sm)", color: "var(--text-soft)" }}
        >
          One email a week. Easy unsubscribe, always.
        </p>
      </div>
    </section>
  );
}
