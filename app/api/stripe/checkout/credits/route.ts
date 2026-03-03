import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

const CREDIT_PACKAGES = {
  "10": { cents: 1500, label: "10 Task Credits" },
  "30": { cents: 3900, label: "30 Task Credits" },
  "50": { cents: 5900, label: "50 Task Credits" },
} as const;

type PackageKey = keyof typeof CREDIT_PACKAGES;

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
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitResult = await checkRateLimit(`stripe-credits:${user.id}`, RATE_LIMITS.stripeCheckout);
    if (!limitResult.success) {
      const retryAfter = Math.max(1, limitResult.reset - Math.floor(Date.now() / 1000));
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const pkg = body?.package as string | undefined;
    if (!pkg || !(pkg in CREDIT_PACKAGES)) {
      return NextResponse.json(
        { error: "package must be one of: 10, 30, 50" },
        { status: 400 }
      );
    }

    const { cents, label } = CREDIT_PACKAGES[pkg as PackageKey];
    const secretKey = requireEnv("STRIPE_SECRET_KEY");
    const siteUrl = requireEnv("NEXT_PUBLIC_SITE_URL");
    const stripe = new Stripe(secretKey);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: cents,
            product_data: {
              name: label,
              description: "Task Credits for your Mom Ops account. Purchased credits never expire.",
              images: [],
            },
          },
        },
      ],
      success_url: `${siteUrl}/member?checkout=credits_success`,
      cancel_url: `${siteUrl}/member/credits`,
      client_reference_id: user.id,
      metadata: {
        mode: "credit_package",
        member_id: user.id,
        credits: pkg,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Checkout failed";
    console.error("[stripe/checkout/credits]", message, err);
    return NextResponse.json(
      { error: message, code: "CHECKOUT_ERROR" },
      { status: 500 }
    );
  }
}
