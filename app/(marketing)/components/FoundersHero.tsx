import CheckoutButton from "./CheckoutButton";
import FoundersCounter from "./FoundersCounter";

type Props = { claimed: number };

export default function FoundersHero({ claimed }: Props) {
  const isFull = claimed >= 50;

  return (
    <section className="hero founders-hero">
      <div className="container">
        <p className="hero-brand">Mom Ops</p>
        <h1 className="hero-headline">
          Your Personal Household Virtual Assistant (VA), without Hiring
          Full-Time
        </h1>
        <p className="hero-subhead">
          Household admin, handled by a real mom VA.
          <br />
          Structured membership.
          <br />
          Clear timelines.
          <br />
          No hourly billing. No guesswork.
        </p>
        <p className="hero-price">
          $29.95/month includes 45 Task Credits. Roll over up to 3 months. Add
          more anytime.
        </p>
        <p className="founders-first50">First 50 only</p>
        <FoundersCounter claimed={claimed} />
        <p className="founders-lock-copy">
          Same membership, discounted for early adopters. Locked in for life
          unless you cancel.
        </p>
        <p className="hero-price founders-price">
          <span className="founders-price-was">$29.95/month</span>{" "}
          <strong>$15.95/month</strong>
        </p>
        {isFull ? (
          <a href="/" className="btn btn-primary">
            Join at standard price
          </a>
        ) : (
          <CheckoutButton className="btn btn-primary" priceType="founders">
            Join Founding Members
          </CheckoutButton>
        )}
        <p className="founders-trust">Secure checkout by Stripe.</p>
      </div>
    </section>
  );
}
