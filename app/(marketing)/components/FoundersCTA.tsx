import CheckoutButton from "./CheckoutButton";

type Props = { claimed: number };

export default function FoundersCTA({ claimed }: Props) {
  const isFull = claimed >= 50;

  return (
    <section id="cta" className="section cta-section founders-cta">
      <div className="container">
        <h2 className="section-title">Why become a Founding Member?</h2>
        <ul className="founders-benefits">
          <li>Early access to new features</li>
          <li>Input on development (we want your feedback)</li>
          <li>
            Opportunities to earn extra credits{" "}
            <a href="/#credits">in the member portal</a>
          </li>
        </ul>
        <p className="section-lead founders-cta-lead">
          Same 45 Task Credits per month, same support—just $15.95/month locked in
          for life (first 50 only).
        </p>
        {isFull ? (
          <a href="/" className="btn btn-primary btn-large">
            Join at standard price
          </a>
        ) : (
          <CheckoutButton
            className="btn btn-primary btn-large"
            priceType="founders"
          >
            Join Founding Members — $15.95/month
          </CheckoutButton>
        )}
        <p className="cta-note">Secure checkout by Stripe.</p>
      </div>
    </section>
  );
}
