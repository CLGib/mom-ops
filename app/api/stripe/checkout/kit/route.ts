import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { getKit } from "@/lib/kits";

export const runtime = "nodejs";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const kit = slug ? getKit(slug) : null;
    if (!kit) {
      return NextResponse.json({ error: "Unknown kit" }, { status: 400 });
    }

    // Rate limit by user if logged in, else by IP (guest checkout is allowed).
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const rlKey = user ? `stripe-kit:${user.id}` : `stripe-kit:${getClientIp(request)}`;
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

    const metadata: Record<string, string> = { mode: "kit_purchase", kit_id: kit.slug };
    if (user) metadata.member_id = user.id;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: kit.priceCents,
            product_data: {
              name: kit.title,
              description: kit.blurb,
              images: [],
            },
          },
        },
      ],
      success_url: `${siteUrl}/kits/${kit.slug}/thanks`,
      cancel_url: `${siteUrl}/kits/${kit.slug}`,
      // Associate directly when we know the buyer; otherwise the webhook matches
      // by email or creates a guest account (mirrors the subscription flow).
      client_reference_id: user?.id,
      customer_email: user?.email ?? undefined,
      metadata,
      // Disable Stripe Link so a shared link doesn't pre-fill someone else's payment.
      wallet_options: { link: { display: "never" } } as { link: { display: "never" } },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    console.error("[stripe/checkout/kit]", message, err);
    return NextResponse.json({ error: message, code: "CHECKOUT_ERROR" }, { status: 500 });
  }
}
