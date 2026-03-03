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
  sidebarExtra?: React.ReactNode;
  children: React.ReactNode;
};

export default function SidebarLayout({
  brandLabel,
  brandHref,
  navLinks,
  headerRight,
  sidebarExtra,
  children,
}: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="app-shell sidebar-layout" style={{ width: "100%", minHeight: "100vh" }}>
      <header
        className="sidebar-layout__header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-md)",
          padding: "var(--space-sm) var(--space-md)",
          marginBottom: "var(--space-md)",
          borderBottom: "1px solid var(--color-border, #e5e5e5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", minWidth: 0, flexShrink: 0 }}>
          <button
            type="button"
            className="sidebar-layout__hamburger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
          <Link href={brandHref} className="link sidebar-layout__brand" style={{ fontSize: "0.9rem", fontWeight: 500, whiteSpace: "nowrap" }}>
            {brandLabel}
          </Link>
        </div>
        <div className="sidebar-layout__header-right">
          {headerRight}
        </div>
      </header>

      <div
        className={`sidebar-layout__overlay ${menuOpen ? "sidebar-layout__overlay--open" : ""}`}
        aria-hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
      />

      <div className="sidebar-layout__body" style={{ display: "flex", gap: "var(--space-lg)", alignItems: "flex-start", flex: 1 }}>
        <nav
          className={`sidebar-layout__drawer admin-sidebar ${menuOpen ? "sidebar-layout__drawer--open" : ""}`}
          aria-label="Navigation"
          style={{
            width: "220px",
            flexShrink: 0,
            padding: "var(--space-md) 0",
            borderRight: "1px solid var(--color-border, #e5e5e5)",
          }}
        >
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {navLinks.map(({ href, label }) => {
              const isActive =
                href === brandHref
                  ? pathname === brandHref
                  : pathname.startsWith(href);
              return (
                <li key={href} style={{ marginBottom: "var(--space-xs)" }}>
                  <Link
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: "block",
                      padding: "var(--space-sm) var(--space-md)",
                      borderRadius: "var(--radius, 6px)",
                      color: isActive ? "var(--accent)" : "var(--text-muted, #666)",
                      fontWeight: isActive ? 600 : 400,
                      textDecoration: "none",
                      backgroundColor: isActive
                        ? "var(--accent-soft-bg, #f8f5ed)"
                        : "transparent",
                      border: "1px solid rgba(184, 134, 11, 0.35)",
                      borderLeft: isActive
                        ? "3px solid var(--accent)"
                        : "1px solid rgba(184, 134, 11, 0.35)",
                    }}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          {sidebarExtra && (
            <div
              style={{
                marginTop: "var(--space-lg)",
                paddingTop: "var(--space-md)",
                borderTop: "1px solid var(--color-border, #e5e5e5)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-sm)",
              }}
            >
              {sidebarExtra}
            </div>
          )}
        </nav>

        <main style={{ flex: 1, minWidth: 0 }} className="app-shell--wide">
          {children}
        </main>
      </div>
    </div>
  );
}
