import Link from "next/link";

export default function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <h1 className="hero-headline">
          The operating system for modern family life.
        </h1>
        <p className="hero-subhead">
          Tell Mom Ops a family task &mdash; plan the week&apos;s dinners,
          research summer camps, draft the school email &mdash; and get it back
          done in about a minute. Powered by AI, with real people when you want a
          human touch.
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
          <Link
            href="/signup?next=/member&offer=free_trial"
            className="btn btn-primary"
          >
            Try your first helper free
          </Link>
          <a href="#how-it-works" className="btn btn-secondary">
            See how it works
          </a>
        </div>
        <p
          className="form-note"
          style={{ marginTop: "var(--space-sm)", color: "var(--text-muted)" }}
        >
          Your first helper is free. No credit card.
        </p>
      </div>
    </section>
  );
}
