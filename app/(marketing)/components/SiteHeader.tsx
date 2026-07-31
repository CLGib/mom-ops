export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a href="/" className="logo">
          Mom Ops
        </a>
        <nav className="nav" aria-label="Main">
          <a href="#experiments">What I&apos;m building</a>
          <a href="#newsletter" className="nav-cta nav-cta-button">
            Newsletter
          </a>
        </nav>
      </div>
    </header>
  );
}
