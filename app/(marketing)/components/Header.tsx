import Link from "next/link";
import CheckoutButton from "./CheckoutButton";

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a href="#" className="logo">
          Mom Ops
        </a>
        <nav className="nav">
          <a href="#how-it-works">How It Works</a>
          <a href="#credits">Task Credits</a>
          <a href="#faq">FAQ</a>
          <CheckoutButton className="nav-cta nav-cta-button">
            Get Started
          </CheckoutButton>
          <Link href="/login" className="btn btn-primary">
            Login
          </Link>
        </nav>
        <button
          type="button"
          className="menu-toggle"
          aria-label="Open menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
