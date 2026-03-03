"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string };

type Props = {
  brandLabel: string;
  brandHref: string;
  navLinks: NavLink[];
  headerRight: React.ReactNode;
  children: React.ReactNode;
};

const BOTTOM_NAV_LINKS = [
  { href: "/member", label: "Home", short: "Home" },
  { href: "/member/pending", label: "Tasks", short: "Tasks" },
  { href: "/member/reviews", label: "Reviews", short: "Reviews" },
] as const;

export default function MemberPortalLayout({
  brandLabel,
  brandHref,
  navLinks,
  headerRight,
  children,
}: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const moreLinks = navLinks.filter(
    (n) => !BOTTOM_NAV_LINKS.some((b) => b.href === n.href || (b.href === "/member" && n.href === "/member"))
  );

  function isActive(href: string): boolean {
    if (href === brandHref) return pathname === brandHref;
    if (href === "/member#submit") return pathname === "/member";
    return pathname.startsWith(href);
  }

  return (
    <div className="member-portal" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <header
        className="member-portal__header"
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-sm)",
          padding: "var(--space-sm) var(--space-md)",
          borderBottom: "1px solid var(--color-border, #e8e6e2)",
          backgroundColor: "var(--surface, #fff)",
          minHeight: 56,
        }}
      >
        <Link
          href={brandHref}
          prefetch={false}
          className="member-portal__brand link"
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            color: "var(--text, #1a1917)",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {brandLabel}
        </Link>
        <div className="member-portal__header-right" style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", minWidth: 0 }}>
          {headerRight}
          <button
            type="button"
            className="member-portal__menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              minWidth: 44,
              minHeight: 44,
              padding: 0,
              border: "none",
              background: "transparent",
              borderRadius: "var(--radius, 8px)",
              cursor: "pointer",
              color: "var(--text, #1a1917)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Overlay + "More" drawer */}
      <div
        className={`member-portal__overlay ${menuOpen ? "member-portal__overlay--open" : ""}`}
        aria-hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.35)",
          zIndex: 200,
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
          transition: "opacity 0.2s ease",
        }}
      />
      <aside
        className={`member-portal__drawer ${menuOpen ? "member-portal__drawer--open" : ""}`}
        aria-label="Menu"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(320px, 100%)",
          maxWidth: "100%",
          backgroundColor: "var(--surface, #fff)",
          boxShadow: "-4px 0 20px rgba(0,0,0,0.15)",
          zIndex: 201,
          padding: "var(--space-lg) var(--space-md)",
          overflowY: "auto",
          transform: menuOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-lg)" }}>
          <span style={{ fontWeight: 600, fontSize: "1.125rem" }}>Menu</span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            style={{
              width: 44,
              height: 44,
              minWidth: 44,
              minHeight: 44,
              padding: 0,
              border: "none",
              background: "transparent",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted, #5c5955)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {moreLinks.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <li key={href} style={{ marginBottom: "var(--space-2xs)" }}>
                <Link
                  href={href}
                  prefetch={false}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "14px var(--space-md)",
                    borderRadius: "var(--radius)",
                    color: active ? "var(--accent, #b8860b)" : "var(--text, #1a1917)",
                    fontWeight: active ? 600 : 500,
                    textDecoration: "none",
                    backgroundColor: active ? "var(--accent-soft-bg, #f8f5ed)" : "transparent",
                    minHeight: 44,
                  }}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>

      <main className="member-portal__main" style={{ flex: 1, minWidth: 0, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>
        {children}
      </main>

      {/* Bottom nav: mobile-first, visible on small screens */}
      <nav
        className="member-portal__bottom-nav"
        aria-label="Primary navigation"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "stretch",
          justifyContent: "space-around",
          backgroundColor: "var(--surface, #fff)",
          borderTop: "1px solid var(--color-border, #e8e6e2)",
          paddingBottom: "env(safe-area-inset-bottom, 0)",
          minHeight: "calc(56px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {BOTTOM_NAV_LINKS.map(({ href, label, short }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                padding: "var(--space-xs) var(--space-2xs)",
                minHeight: 56,
                minWidth: 0,
                color: active ? "var(--accent, #b8860b)" : "var(--text-muted, #5c5955)",
                fontWeight: active ? 600 : 500,
                textDecoration: "none",
                fontSize: "0.6875rem",
              }}
            >
              <span style={{ fontSize: "1.125rem", lineHeight: 1 }} aria-hidden>
                {short === "Home" && "🏠"}
                {short === "Tasks" && "📋"}
                {short === "Reviews" && "⭐"}
              </span>
              <span>{short}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="More menu"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            padding: "var(--space-xs)",
            minHeight: 56,
            minWidth: 0,
            border: "none",
            background: "transparent",
            color: "var(--text-muted, #5c5955)",
            fontWeight: 500,
            fontSize: "0.6875rem",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "1.25rem", lineHeight: 1 }} aria-hidden>⋯</span>
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
