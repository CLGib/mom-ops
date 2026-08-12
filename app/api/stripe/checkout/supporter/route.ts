import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// "The Regulars" — a single $9.95/month membership. Uses inline recurring
// price_data so there is no pre-created Stripe Price or extra env var.
const SUPPORTER_CENTS = 995;

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const rlKey = user ? `stripe-supporter:${user.id}` : `stripe-supporter:${getClientIp(request)}`;
    const limitResult = await checkRateLimit(rlKey, RATE_LIMITS.stripeCheckout);
    if (!limitResult.success) {
      const retryAfter = Math.max(1, limitResult.reset - Math.floor(Date.now() / 1000));
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const secretKey = requireEnv("STRIPE_SECRET_KEY");
    const siteUrl = requireEnv("NEXT_PUBLIC_SITE_URL");
    const stripe = new Stripe(secretKey);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: SUPPORTER_CENTS,
            recurring: { interval: "month" },
            product_data: {
              name: "The Regulars",
              description: "All-access to everything Chrissy builds on Mom Ops, plus early access.",
            },
          },
        },
      ],
      success_url: `${siteUrl}/my-stuff?supporter=success`,
      cancel_url: `${siteUrl}/my-stuff`,
      client_reference_id: user?.id,
      customer_email: user?.email ?? undefined,
      metadata: { mode: "supporter" },
      subscription_data: { metadata: { mode: "supporter", ...(user ? { user_id: user.id } : {}) } },
      wallet_options: { link: { display: "never" } } as { link: { display: "never" } },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    console.error("[stripe/checkout/supporter]", message, err);
    return NextResponse.json({ error: message, code: "CHECKOUT_ERROR" }, { status: 500 });
  }
}
