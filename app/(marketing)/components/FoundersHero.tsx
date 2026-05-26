"use client";

import CheckoutButton from "./CheckoutButton";
import FoundersCounter from "./FoundersCounter";
import { useFoundersCount } from "./FoundersCountContext";

export default function FoundersHero() {
  const claimed = useFoundersCount();
  const isFull = claimed >= 50;

  return (
    <section className="hero founders-hero">
      <div className="container">
        <h1 className="hero-headline">
          Founding members of the family operating system.
        </h1>
        <p className="hero-subhead">
          AI-powered playbooks, household agents, and optional human support.
          <br />
          Early access as we roll new playbooks out, all month.
        </p>
        <p className="hero-price">
          Unlimited Mom Ops access. $29.95/month standard.
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
