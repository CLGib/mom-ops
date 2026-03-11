/**
 * Fire Meta (Facebook) Pixel events for Ads. Only runs when NEXT_PUBLIC_META_PIXEL_ID is set.
 * Use from client components for conversion tracking.
 *
 * Standard events: https://developers.facebook.com/docs/meta-pixel/reference
 * - Lead: form submit, signup intent
 * - CompleteRegistration: account created / onboarding complete
 * - InitiateCheckout: started checkout
 * - Purchase: completed purchase (often fired from server/webhook)
 */

declare global {
  interface Window {
    fbq?: (
      action: "init" | "track" | "trackCustom",
      eventName: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

export type MetaPixelStandardEvent =
  | "AddPaymentInfo"
  | "AddToCart"
  | "AddToWishlist"
  | "CompleteRegistration"
  | "Contact"
  | "InitiateCheckout"
  | "Lead"
  | "PageView"
  | "Purchase"
  | "Search"
  | "StartTrial"
  | "SubmitApplication"
  | "ViewContent";

export function trackMetaPixelEvent(
  eventName: MetaPixelStandardEvent | string,
  params?: Record<string, unknown>
): void {
  if (typeof window === "undefined" || !window.fbq) return;
  if (params && Object.keys(params).length > 0) {
    window.fbq("track", eventName, params);
  } else {
    window.fbq("track", eventName);
  }
}

export function trackMetaPixelCustomEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !window.fbq) return;
  if (params && Object.keys(params).length > 0) {
    window.fbq("trackCustom", eventName, params);
  } else {
    window.fbq("trackCustom", eventName);
  }
}
