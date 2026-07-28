import Link from "next/link";

export default function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <h1 className="hero-headline">
          Finally, your to-do list handles itself.
        </h1>
        <p className="hero-subhead">
          Tell Mom Ops what&apos;s on your plate — a birthday party, the week&apos;s
          dinners, summer camp research — and get it back done in seconds. Built by
          moms. Backed by real humans when a task needs one.
        </p>
        <Link
          href="/signup?next=/member&offer=free_trial"
          className="btn btn-primary"
        >
          Try Your First Task Free
        </Link>
      </div>
    </section>
  );
}
