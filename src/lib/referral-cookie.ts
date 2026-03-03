/**
 * Client-side only: persist referral code in cookie so it survives login/signup and is sent to checkout.
 * Used for member → member referral (15/15 credits on first subscription).
 */

const COOKIE_NAME = "mom_ops_referral";
const MAX_AGE_DAYS = 7;

export function setReferralCookie(referralCode: string): void {
  if (typeof document === "undefined") return;
  const value = referralCode.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return;
  const secure = typeof window !== "undefined" && window.location?.protocol === "https:";
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE_DAYS * 24 * 60 * 60}; samesite=lax${secure ? "; secure" : ""}`;
}

export function getReferralCode(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

export function clearReferralCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}
