import Link from "next/link";

export default function CTA() {
  return (
    <section id="cta" className="section cta-section">
      <div className="container">
        <h2 className="section-title">Get started</h2>
        <p className="section-lead">
          Try your first task free. No credit card required to sign up.
        </p>
        <Link
          href="/signup?next=/member&offer=free_trial"
          className="btn btn-primary btn-large"
        >
          Try Your First Task Free
        </Link>
        <p className="cta-guarantee">
          <a href="/terms#money-back-guarantee">
            Money-back guarantee: Sign up and don&apos;t love your first task?
            Request a refund.
          </a>
        </p>
        <p className="cta-note">No commitment. Try one task free.</p>
      </div>
    </section>
  );
}
