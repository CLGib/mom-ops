import type { Metadata } from "next";
import Link from "next/link";
import { DM_Serif_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import "./landing.css";

const dmSerif = DM_Serif_Display({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-display",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Page not found | Mom Ops",
  description: "This page could not be found.",
};

export default function GlobalNotFound() {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${sourceSans.variable}`}
    >
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
