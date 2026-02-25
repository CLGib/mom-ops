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
          Founding Members: Lock in $15.95/month (First 50 only)
        </h1>
        <p className="hero-subhead">
          Same membership, discounted for early adopters. Locked in for life
          unless you cancel.
        </p>
        <p className="hero-price founders-price">
          <span className="founders-price-was">$29.95/month</span>{" "}
          <strong>$15.95/month</strong>
        </p>
        <FoundersCounter claimed={claimed} />
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
