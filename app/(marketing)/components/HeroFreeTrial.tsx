import Link from "next/link";

export default function HeroFreeTrial() {
  return (
    <section className="hero">
      <div className="container">
        <h1 className="hero-headline">
          Finally, a Virtual Assistant for Your To-Do List
        </h1>
        <p className="hero-subhead">
          Household admin, handled by a real mom virtual assistant.
          <br />
          Clear timelines.
          <br />
          No hourly billing. No guesswork.
        </p>
        <p className="hero-price">
          Free to sign up. Your first task is free — 35 credits to try us.
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
