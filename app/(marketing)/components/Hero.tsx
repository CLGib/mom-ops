import Link from "next/link";

export default function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <h1 className="hero-headline">
          The operating system for modern family life.
        </h1>
        <p className="hero-subhead">
          Mom Ops gives busy households a library of helpers, household memory,
          and optional human support &mdash; so the mental tabs you never close
          finally have somewhere to live.
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
            Start free
          </Link>
          <a href="#how-it-works" className="btn btn-secondary">
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}
