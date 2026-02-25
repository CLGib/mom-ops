import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="logo">
            Mom Ops
          </Link>
          <nav className="nav">
            <Link href="/">Home</Link>
            <Link href="/login" className="btn btn-primary">
              Login
            </Link>
          </nav>
        </div>
      </header>
      <main className="not-found-main">
        <p className="not-found-label">Page not found</p>
        <h1 className="not-found-title">404</h1>
        <p className="not-found-message">
          This page got lost in the chaos. We&apos;ve got you.
        </p>
        <Link href="/" className="not-found-link">
          Back to home
        </Link>
      </main>
    </>
  );
}
