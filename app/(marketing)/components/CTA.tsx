import CheckoutButton from "./CheckoutButton";

export default function CTA() {
  return (
    <section id="cta" className="section cta-section">
      <div className="container">
        <h2 className="section-title">Get started</h2>
        <p className="section-lead">
          $29.95/month includes 45 Task Credits (roll over up to 3 months). Add
          more credits anytime. No long-term commitment.
        </p>
        <CheckoutButton className="btn btn-primary btn-large">
          Join Mom Ops - $29.95/month
        </CheckoutButton>
        <p className="cta-guarantee">
          Money-back guarantee: Sign up and don&apos;t love your first task?
          Request a refund.
        </p>
        <p className="cta-note">Stripe-ready. Secure checkout.</p>
      </div>
    </section>
  );
}
