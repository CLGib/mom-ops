import Link from "next/link";

export default function CTA() {
  return (
    <section id="cta" className="section cta-section">
      <div className="container">
        <h2 className="section-title">Bring in your first helper.</h2>
        <p className="section-lead">
          See what it feels like to close one mental tab without doing the work
          yourself.
        </p>
        <Link
          href="/signup?next=/member&offer=free_trial"
          className="btn btn-primary btn-large"
        >
          Start free
        </Link>
        <p className="cta-guarantee">
          <a href="/terms#money-back-guarantee">
            Money-back guarantee: Sign up and don&apos;t love your first
            helper? Request a refund.
          </a>
        </p>
        <p className="cta-note">No commitment. No credit card to start.</p>
      </div>
    </section>
  );
}
