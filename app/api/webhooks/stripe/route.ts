import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Idempotent: try to claim this event. Returns true if we should skip (already processed), false if we should process. */
async function claimEvent(supabase: ReturnType<typeof createClient>, eventId: string): Promise<boolean> {
  const { error } = await supabase.from("stripe_webhook_events").insert({ event_id: eventId });
  if (error?.code === "23505") return true; // unique violation = already processed
  if (error) return true; // other error: skip to avoid double-grant
  return false;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const supabase = getSupabase();

  if (event.type === "checkout.session.completed") {
    if (await claimEvent(supabase, event.id)) {
      return NextResponse.json({ received: true, idempotent: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const userId =
      (session.client_reference_id as string) || session.metadata?.user_id;
    if (!userId) {
      return NextResponse.json({
        received: true,
        skipped: "no client_reference_id or metadata.user_id",
      });
    }

    const { error: creditError } = await supabase
      .from("credit_transactions")
      .insert({
        member_id: userId,
        amount: 45,
        type: "purchase",
      });

    if (creditError) {
      console.error("Webhook: credit_transactions insert failed", creditError);
      return NextResponse.json(
        { error: "Failed to grant credits", detail: creditError.message },
        { status: 500 }
      );
    }

    await supabase
      .from("profiles")
      .update({ subscription_status: "active" })
      .eq("id", userId);
  } else if (event.type === "customer.subscription.deleted") {
    if (await claimEvent(supabase, event.id)) {
      return NextResponse.json({ received: true, idempotent: true });
    }

    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.user_id;
    if (!userId) {
      return NextResponse.json({
        received: true,
        skipped: "no user_id in subscription metadata",
      });
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ subscription_status: "canceled" })
      .eq("id", userId);

    if (updateError) {
      console.error("Webhook: profiles update failed", updateError);
      return NextResponse.json(
        { error: "Failed to mark subscription canceled", detail: updateError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
