import CheckoutButton from "./CheckoutButton";

export default function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <h1 className="hero-headline">
          Your Personal Household Virtual Assistant (VA), without Hiring
          Full-Time
        </h1>
        <p className="hero-subhead">
          Household admin, handled by a real mom VA.
          <br />
          Clear timelines.
          <br />
          No hourly billing. No guesswork.
        </p>
        <p className="hero-price">
          $29.95/month includes 35 Task Credits. Roll over up to 3 months. Add
          more anytime.
        </p>
        <CheckoutButton className="btn btn-primary">
          Get started
        </CheckoutButton>
      </div>
    </section>
  );
}
