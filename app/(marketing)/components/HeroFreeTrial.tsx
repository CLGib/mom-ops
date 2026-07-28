import Link from "next/link";

export default function HeroFreeTrial() {
  return (
    <section className="hero">
      <div className="container">
        <h1 className="hero-headline">
          Finally, your to-do list handles itself.
        </h1>
        <p className="hero-subhead">
          Tell us what&apos;s on your plate and get it back done in seconds.
          <br />
          Built by moms. Backed by real humans when a task needs one.
          <br />
          No hourly billing. No guesswork.
        </p>
        <p className="hero-price">
          Free to sign up. Your first task is free.
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
