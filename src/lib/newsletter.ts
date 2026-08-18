import crypto from "node:crypto";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://themomops.com";

/**
 * Emails allowed to send a broadcast (the site owner). This is a personal-brand
 * site, so the owner is a small hardcoded allowlist, overridable via env.
 */
export const NEWSLETTER_OWNERS = (
  process.env.NEWSLETTER_ADMIN_EMAILS ?? "clriley903@gmail.com,chrissy@themomops.com"
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isNewsletterOwner(email: string | null | undefined): boolean {
  return !!email && NEWSLETTER_OWNERS.includes(email.toLowerCase());
}

/** Server-only HMAC key. Falls back to the service-role key so no new env var is required. */
function secret(): string {
  return (
    process.env.NEWSLETTER_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "insecure-dev-secret"
  );
}

/** Stateless unsubscribe token: HMAC of the lowercased email. No DB column needed. */
export function unsubscribeToken(email: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

export function unsubscribeUrl(email: string): string {
  const e = encodeURIComponent(email.trim().toLowerCase());
  return `${SITE_URL}/api/unsubscribe?e=${e}&t=${unsubscribeToken(email)}`;
}

/** Constant-time verification of an unsubscribe token against an email. */
export function verifyUnsubscribe(email: string, token: string): boolean {
  if (!email || !token) return false;
  const expected = unsubscribeToken(email);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
