import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST(request: Request) {
  try {
    const secretKey = requireEnv("STRIPE_SECRET_KEY");
    const stripe = new Stripe(secretKey);
    const priceId = requireEnv("STRIPE_PRICE_ID");
    const siteUrl = requireEnv("NEXT_PUBLIC_SITE_URL");

    let referralCode: string | null = null;
    try {
      const body = await request.json().catch(() => ({}));
      const ref = body?.referral_code ?? body?.ref;
      if (typeof ref === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref.trim())) {
        referralCode = ref.trim();
      }
    } catch {
      // ignore
    }

    const sessionMeta: Record<string, string> = {};
    if (referralCode) sessionMeta.referred_by = referralCode;

    // Always guest checkout so the person on the page enters their own email and card
    // (avoids pre-filling a logged-in user's payment info when the link is shared).
    // Webhook matches by email or creates user.
    // Disable Stripe Link so Stripe doesn't pre-fill payment from a recognized email (e.g. in incognito).
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/checkout-success`,
      cancel_url: `${siteUrl}/?checkout=cancel`,
      metadata: sessionMeta,
      subscription_data: referralCode ? { metadata: { referred_by: referralCode } } : undefined,
      wallet_options: { link: { display: "never" } } as { link: { display: "never" } },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 }
      );
    }

    console.log("[stripe/checkout] Session created (guest)", "→", session.url?.slice(0, 50) + "...");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Checkout session failed";
    console.error("[stripe/checkout]", message, err);
    return NextResponse.json(
      { error: message, code: "CHECKOUT_ERROR" },
      { status: 500 }
    );
  }
}
