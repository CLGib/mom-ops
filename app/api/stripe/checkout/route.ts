import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST() {
  const priceId = requireEnv("STRIPE_PRICE_ID");
  const siteUrl = requireEnv("NEXT_PUBLIC_SITE_URL"); // e.g. http://localhost:3000 or https://yourdomain.com

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Optional: If you store stripe_customer_id in profiles, you can reuse it here.
  // For MVP: Stripe will create a customer automatically via email.
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/member?checkout=success`,
    cancel_url: `${siteUrl}/?checkout=cancel`,
    customer_email: user.email ?? undefined,

    // ✅ Easiest: store userId in client_reference_id so the webhook can read it
    client_reference_id: user.id,

    // ✅ Also store in subscription metadata so subscription.deleted has it
    subscription_data: {
      metadata: { user_id: user.id },
    },
  });

  return NextResponse.json({ url: session.url });
}
