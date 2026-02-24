import Link from "next/link";

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a href="#" className="logo">
          Caregiver Co.
        </a>
        <nav className="nav">
          <a href="#how-it-works">How It Works</a>
          <a href="#credits">Task Credits</a>
          <a href="#faq">FAQ</a>
          <a href="#cta" className="nav-cta">
            Get Started
          </a>
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
