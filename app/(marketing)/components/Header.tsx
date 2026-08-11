import Link from "next/link";
import CheckoutButton from "./CheckoutButton";

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a href="/" className="logo">
          Mom Ops
        </a>
        <nav className="nav" aria-label="Main">
          <a href="#how-it-works">How It Works</a>
          <a href="#helpers">Helpers</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <CheckoutButton className="nav-cta nav-cta-button">
            Get Started
          </CheckoutButton>
          <Link href="/login">
            Login
          </Link>
        </nav>
        <div className="nav-mobile">
          <Link href="/login">
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}
