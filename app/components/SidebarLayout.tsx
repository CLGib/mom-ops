"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { group?: string; href: string; label: string; badge?: number; comingSoon?: boolean };

type Props = {
  brandLabel: string;
  brandHref: string;
  navLinks: NavLink[];
  headerRight: React.ReactNode;
  /** Optional content above drawer footer (e.g. VA payout summary). */
  sidebarExtra?: React.ReactNode;
  /** Optional footer at bottom of drawer (e.g. profile, logout). */
  drawerFooter?: React.ReactNode;
  /** Optional class for the main content area (e.g. full-width on task view). */
  contentClassName?: string;
  children: React.ReactNode;
};

function groupLinks(links: NavLink[]): Map<string | null, NavLink[]> {
  const map = new Map<string | null, NavLink[]>();
  for (const link of links) {
    const key = link.group ?? null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(link);
  }
  return map;
}

export default function SidebarLayout({
  brandLabel,
  brandHref,
  navLinks,
  headerRight,
  sidebarExtra,
  drawerFooter,
  contentClassName,
  children,
}: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const groups = groupLinks(navLinks);
  const groupOrder = Array.from(groups.keys());

  return (
    <div className="app-shell sidebar-layout" style={{ width: "100%", minHeight: "100vh" }}>
      <header className="sidebar-layout__header">
        <div className="sidebar-layout__header-left">
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
          <Link href={brandHref} className="link sidebar-layout__brand">
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

      <aside
        className={`sidebar-layout__drawer ${menuOpen ? "sidebar-layout__drawer--open" : ""}`}
        aria-label="Navigation"
      >
        <div className="sidebar-layout__drawer-inner">
          <div className="sidebar-layout__drawer-header">
            <span className="sidebar-layout__drawer-title">{brandLabel}</span>
            <button
              type="button"
              className="sidebar-layout__drawer-close"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="sidebar-layout__drawer-nav">
            {groupOrder.map((groupKey) => {
              const items = groups.get(groupKey)!;
              return (
                <div key={groupKey ?? "default"} className="sidebar-layout__drawer-group">
                  {groupKey && (
                    <div className="sidebar-layout__drawer-group-label">{groupKey}</div>
                  )}
                  <ul className="sidebar-layout__drawer-list">
                    {items.map(({ href, label, badge, comingSoon }) => {
                      if (comingSoon) {
                        return (
                          <li key={`coming-soon-${label}`}>
                            <span
                              className="sidebar-layout__drawer-link sidebar-layout__drawer-link--coming-soon"
                              style={{ cursor: "default", opacity: 0.7 }}
                            >
                              <span className="sidebar-layout__drawer-link-text">{label}</span>
                            </span>
                          </li>
                        );
                      }
                      const isActive =
                        href === brandHref
                          ? pathname === brandHref
                          : pathname.startsWith(href);
                      return (
                        <li key={href}>
                          <Link
                            href={href}
                            onClick={() => setMenuOpen(false)}
                            className={`sidebar-layout__drawer-link ${isActive ? "sidebar-layout__drawer-link--active" : ""}`}
                          >
                            <span className="sidebar-layout__drawer-link-text">{label}</span>
                            {badge != null && badge > 0 && (
                              <span className="sidebar-layout__drawer-badge" aria-label={`${badge} items`}>
                                {badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
          {sidebarExtra && (
            <div className="sidebar-layout__drawer-extra">
              {sidebarExtra}
            </div>
          )}
          {drawerFooter && (
            <div className="sidebar-layout__drawer-footer">
              {drawerFooter}
            </div>
          )}
        </div>
      </aside>

      <div className="sidebar-layout__body">
        <main className={["sidebar-layout__main", "app-shell--wide", contentClassName].filter(Boolean).join(" ")}>
          {children}
        </main>
      </div>
    </div>
  );
}
