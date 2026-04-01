/**
 * Client-side only: persist offer (e.g. free_trial) in a cookie so it survives
 * login/signup and can be read when granting free trial credits on first member visit.
 */

const COOKIE_NAME = "mom_ops_offer";
const OFFER_FREE_TRIAL = "free_trial";
const MAX_AGE_DAYS = 7;

export function setOfferCookie(offer: string): void {
  if (typeof document === "undefined") return;
  const value = offer.trim().toLowerCase();
  if (value !== OFFER_FREE_TRIAL) return;
  const secure =
    typeof window !== "undefined" && window.location?.protocol === "https:";
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE_DAYS * 24 * 60 * 60}; samesite=lax${secure ? "; secure" : ""}`;
}

export function getOfferCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`)
  );
  const value = match ? decodeURIComponent(match[1]) : null;
  return value === OFFER_FREE_TRIAL ? value : null;
}

export function clearOfferCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

export const OFFER_FREE_TRIAL_VALUE = OFFER_FREE_TRIAL;
