import Link from "next/link";

export default function CTAFreeTrial() {
  return (
    <section id="cta" className="section cta-section">
      <div className="container">
        <h2 className="section-title">Start with one playbook.</h2>
        <p className="section-lead">
          Free to sign up. Your first playbook is free — 35 credits to try us.
          No credit card required.
        </p>
        <Link href="/signup?next=/member&offer=free_trial" className="btn btn-primary btn-large">
          Sign up free
        </Link>
        <p className="cta-note" style={{ marginTop: "var(--space-sm)", marginBottom: 0 }}>
          No credit card required.
        </p>
        <p className="cta-guarantee">
          <a href="/terms#money-back-guarantee">
            Money-back guarantee: Sign up and don&apos;t love your first
            playbook? Request a refund.
          </a>
        </p>
        <p className="cta-note">No commitment. Try one playbook free.</p>
      </div>
    </section>
  );
}
