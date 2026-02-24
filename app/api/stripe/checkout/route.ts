import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST() {
  try {
    requireEnv("STRIPE_SECRET_KEY");
    const priceId = requireEnv("STRIPE_PRICE_ID");
    const siteUrl = requireEnv("NEXT_PUBLIC_SITE_URL");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not logged in", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/member?checkout=success`,
      cancel_url: `${siteUrl}/?checkout=cancel`,
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      subscription_data: {
        metadata: { user_id: user.id },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 }
      );
    }

    console.log("[stripe/checkout] Session created for", user.email, "→", session.url?.slice(0, 50) + "...");
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
