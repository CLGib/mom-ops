import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import "./landing.css";

export const metadata: Metadata = {
  title: "Page not found | Mom Ops",
  description: "This page could not be found.",
};

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
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
      </body>
    </html>
  );
}
