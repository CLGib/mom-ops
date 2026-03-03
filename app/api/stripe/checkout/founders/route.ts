import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const priceId = requireEnv("STRIPE_FOUNDERS_PRICE_ID");
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

    // If the current visitor is logged in, pass their email so Stripe prefills the correct
    // person instead of the last user (Stripe Link/cookies). Guest visitors get no customer_email.
    let customerEmail: string | undefined;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) customerEmail = user.email;
    } catch {
      // ignore; proceed without customer_email
    }

    const sessionMeta: Record<string, string> = {};
    if (referralCode) sessionMeta.referred_by = referralCode;

    // Guest checkout: no customer id so the person on the page enters their own card.
    // When logged in we pass customer_email so Stripe shows the current user, not a previous one.
    // customer_creation is only valid in "payment" mode, not "subscription", so we omit it here.
    // Disable Stripe Link so Stripe doesn't pre-fill from Link when we didn't pass an email.
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/checkout-success`,
      cancel_url: `${siteUrl}/founders?checkout=cancel`,
      metadata: sessionMeta,
      subscription_data: referralCode ? { metadata: { referred_by: referralCode } } : undefined,
      billing_address_collection: "auto",
      ...(customerEmail && { customer_email: customerEmail }),
      wallet_options: { link: { display: "never" } } as { link: { display: "never" } },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 }
      );
    }

    console.log("[stripe/checkout/founders] Session created (guest)", "→", session.url?.slice(0, 50) + "...");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Checkout session failed";
    console.error("[stripe/checkout/founders]", message, err);
    return NextResponse.json(
      { error: message, code: "CHECKOUT_ERROR" },
      { status: 500 }
    );
  }
}
