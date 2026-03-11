"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/va/tasks", label: "Tasks" },
  { href: "/va/email-macros", label: "Email Macros" },
  { href: "/va/onboarding", label: "Onboarding" },
  { href: "/va/profile", label: "Profile" },
] as const;

export default function VANav() {
  const pathname = usePathname();

  return (
    <nav
      className="admin-sidebar"
      aria-label="VA sections"
      style={{
        width: "220px",
        flexShrink: 0,
        padding: "var(--space-md) 0",
        borderRight: "1px solid var(--color-border, #e5e5e5)",
      }}
    >
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {NAV_LINKS.map(({ href, label }) => {
          const isActive =
            href === "/va/tasks"
              ? pathname === "/va" || pathname === "/va/tasks"
              : pathname.startsWith(href);
          return (
            <li key={href} style={{ marginBottom: "var(--space-xs)" }}>
              <Link
                href={href}
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
                  borderLeft: isActive
                    ? "3px solid var(--accent)"
                    : "3px solid transparent",
                }}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
