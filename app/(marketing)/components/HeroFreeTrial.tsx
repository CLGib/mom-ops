import Link from "next/link";

export default function HeroFreeTrial() {
  return (
    <section className="hero">
      <div className="container">
        <h1 className="hero-headline">
          Try the family operating system free.
        </h1>
        <p className="hero-subhead">
          Bring in one helper on us. See what it feels like to close one
          mental tab without doing the work yourself.
          <br />
          AI-powered. Human support included.
        </p>
        <p className="hero-price">
          Try a helper on us. No credit card required.
        </p>
        <Link
          href="/signup?next=/member&offer=free_trial"
          className="btn btn-primary"
        >
          Sign up free
        </Link>
        <p className="hero-cta-note" style={{ marginTop: "var(--space-sm)", fontSize: "0.9375rem", color: "var(--text-muted)" }}>
          No credit card required.
        </p>
      </div>
    </section>
  );
}
