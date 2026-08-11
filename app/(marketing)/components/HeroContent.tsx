export default function HeroContent() {
  return (
    <section className="hero">
      <div className="container">
        <h1 className="hero-headline">
          Average at everything.
          <br />
          Dangerous when it&apos;s all combined.
        </h1>
        <p className="hero-subhead" style={{ maxWidth: "48ch" }}>
          I build businesses, products, websites, systems, communities, and weird
          little ideas. I&apos;m not the world&apos;s best designer, marketer, or
          developer. But somehow, when you combine curiosity, AI, operations,
          creativity, and relentless experimentation, things grow.
        </p>
        <p
          className="hero-subhead"
          style={{ maxWidth: "48ch", fontWeight: 600, color: "var(--text)" }}
        >
          Welcome to my digital notebook.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "var(--space-sm)",
            marginTop: "var(--space-md)",
          }}
        >
          <a href="#newsletter" className="btn btn-primary">
            Join the newsletter
          </a>
          <a href="#experiments" className="btn btn-secondary">
            See what I&apos;m building
          </a>
        </div>
      </div>
    </section>
  );
}
