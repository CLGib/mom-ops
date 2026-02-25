import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Idempotent: try to claim this event. Returns true if we should skip (already processed), false if we should process. */
async function claimEvent(supabase: SupabaseClient, eventId: string): Promise<boolean> {
  // Table may not be in generated types; assert row shape for insert
  const { error } = await supabase
    .from("stripe_webhook_events")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ event_id: eventId } as any);
  if (error?.code === "23505") return true; // unique violation = already processed
  if (error) return true; // other error: skip to avoid double-grant
  return false;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  const stripe = getStripe();
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
  console.log("[webhook] Received event:", event.type, "id:", event.id);

  if (event.type === "checkout.session.completed") {
    const alreadyProcessed = await claimEvent(supabase, event.id);
    if (alreadyProcessed) {
      console.log("[webhook] checkout.session.completed already processed (idempotent)");
      return NextResponse.json({ received: true, idempotent: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    let userId =
      (session.client_reference_id as string) || session.metadata?.user_id;

    if (!userId) {
      const email =
        session.customer_email ||
        (session.customer_details?.email as string | undefined);
      if (email) {
        const {
          data: { users },
        } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const match = users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (match) userId = match.id;
      }
    }

    if (!userId) {
      console.log("[webhook] checkout.session.completed skipped: no user id (client_reference_id or email match)");
      return NextResponse.json({
        received: true,
        skipped: "no client_reference_id, metadata.user_id, or matching user by email",
      });
    }

    let isFounding = false;
    const subscriptionId = session.subscription as string | undefined;
    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;
        const foundersPriceId = process.env.STRIPE_FOUNDERS_PRICE_ID;
        isFounding = !!foundersPriceId && priceId === foundersPriceId;
      } catch (e) {
        console.warn("[webhook] could not retrieve subscription for founding check", e);
      }
    }

    // Respond 200 quickly so Stripe can redirect the customer, then finish DB work
    const userIdFinal = userId;
    const isFoundingFinal = isFounding;
    setImmediate(() => {
      getSupabase()
        .from("credit_transactions")
        .insert({ member_id: userIdFinal, amount: 45, type: "purchase" })
        .then(({ error: creditError }) => {
          if (creditError) {
            console.error("[webhook] credit_transactions insert failed", creditError);
            return;
          }
          const profileUpdate: { subscription_status: string; is_founding_member?: boolean } = { subscription_status: "active" };
          if (isFoundingFinal) profileUpdate.is_founding_member = true;
          getSupabase()
            .from("profiles")
            .update(profileUpdate)
            .eq("id", userIdFinal)
            .then(() => {
              console.log("[webhook] checkout.session.completed: granted 45 credits + active for user", userIdFinal, isFoundingFinal ? "(founding member)" : "");
            });
        });
    });

    return NextResponse.json({ received: true });
  } else if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription;
    };
    // Only grant credits on subscription renewal (first invoice is handled by checkout.session.completed)
    if (invoice.billing_reason !== "subscription_cycle") {
      return NextResponse.json({ received: true, skipped: "not a renewal" });
    }
    const subscriptionId =
      typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id;
    if (!subscriptionId) {
      return NextResponse.json({ received: true, skipped: "no subscription" });
    }
    if (await claimEvent(supabase, event.id)) {
      return NextResponse.json({ received: true, idempotent: true });
    }
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.user_id;
    if (!userId) {
      return NextResponse.json({
        received: true,
        skipped: "no user_id in subscription metadata",
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
      console.error("[webhook] renewal credit_transactions insert failed", creditError);
      return NextResponse.json(
        { error: "Failed to grant renewal credits", detail: creditError.message },
        { status: 500 }
      );
    }
    console.log("[webhook] invoice.paid (renewal): granted 45 credits for user", userId);
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
