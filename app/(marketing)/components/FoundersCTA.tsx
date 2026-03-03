"use client";

import CheckoutButton from "./CheckoutButton";
import { useFoundersCount } from "./FoundersCountContext";

const benefits = [
  "Early access to new features",
  "Input on development (we want your feedback)",
  { text: "Opportunities to earn extra credits ", link: { href: "/#credits", label: "in the member portal" } },
];

export default function FoundersCTA() {
  const claimed = useFoundersCount();
  const isFull = claimed >= 50;

  return (
    <section id="cta" className="section cta-section founders-cta">
      <div className="container">
        <div className="founders-cta-card">
          <p className="founders-cta-badge">First 50 only</p>
          <h2 className="founders-cta-title">Why become a Founding Member?</h2>
          <ul className="founders-cta-benefits" role="list">
            {benefits.map((item, i) => (
              <li key={i}>
                {typeof item === "string" ? (
                  item
                ) : (
                  <>
                    {item.text}
                    <a href={item.link.href}>{item.link.label}</a>
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className="founders-cta-price">
            Same 35 Task Credits per month, same support, just{" "}
            <strong>$15.95/month</strong> locked in for life.
          </p>
          <div className="founders-cta-actions">
            {isFull ? (
              <a href="/" className="btn btn-primary btn-large founders-cta-btn">
                Join at standard price
              </a>
            ) : (
              <CheckoutButton
                className="btn btn-primary btn-large founders-cta-btn"
                priceType="founders"
              >
                Join Founding Members — $15.95/month
              </CheckoutButton>
            )}
          </div>
          <p className="founders-cta-trust">Secure checkout by Stripe.</p>
        </div>
      </div>
    </section>
  );
}
