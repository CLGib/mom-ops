import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { queueEmail } from "@/lib/email/queue";

// ---- Fix Stripe Invoice subscription typing (InvoiceWithSubscription v2) ----
type InvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
  subscription_details?: {
    subscription?: string | null;
  };
};
// -----------------------------------------------

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

    let createdUserForGuest = false;
    if (!userId) {
      const email =
        session.customer_email ||
        (session.customer_details?.email as string | undefined);
      if (email) {
        const {
          data: { users },
        } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const match = users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (match) {
          userId = match.id;
        } else {
          // Guest checkout: create user and send magic link later
          const randomPassword = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
          const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
            email,
            password: randomPassword,
            email_confirm: true,
          });
          if (createErr || !newUser?.user?.id) {
            console.error("[webhook] createUser for guest checkout failed", createErr);
            return NextResponse.json({
              received: true,
              skipped: "could not create user for guest checkout",
            }, { status: 200 });
          }
          userId = newUser.user.id;
          createdUserForGuest = true;
          const subId = session.subscription as string | undefined;
          if (subId) {
            try {
              await stripe.subscriptions.update(subId, { metadata: { user_id: userId } });
            } catch (e) {
              console.warn("[webhook] could not update subscription metadata", e);
            }
          }
        }
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

    const userIdFinal = userId;
    const isFoundingFinal = isFounding;
    const createdForGuestFinal = createdUserForGuest;
    const guestEmail =
      session.customer_email ||
      (session.customer_details?.email as string | undefined) ||
      null;
    const customerId = typeof session.customer === "string" ? session.customer : (session.customer as { id?: string } | null)?.id ?? null;
    const subscriptionIdForProfile = typeof session.subscription === "string" ? session.subscription : (session.subscription as { id?: string } | null)?.id ?? null;
    const stripeName = session.customer_details?.name ?? null;
    setImmediate(async () => {
      const db = getSupabase();
      const { error: creditError } = await db
        .from("credit_transactions")
        .insert({ member_id: userIdFinal, amount: 45, type: "purchase" });
      if (creditError) {
        console.error("[webhook] credit_transactions insert failed", creditError);
        return;
      }
      const profileUpdate: {
        subscription_status: string;
        is_founding_member?: boolean;
        stripe_customer_id?: string | null;
        stripe_subscription_id?: string | null;
        full_name?: string | null;
      } = { subscription_status: "active" };
      if (isFoundingFinal) profileUpdate.is_founding_member = true;
      if (customerId) profileUpdate.stripe_customer_id = customerId;
      if (subscriptionIdForProfile) profileUpdate.stripe_subscription_id = subscriptionIdForProfile;
      const { data: existingProfile } = await db
        .from("profiles")
        .select("full_name")
        .eq("id", userIdFinal)
        .single();
      if (existingProfile?.full_name == null && stripeName && typeof stripeName === "string" && stripeName.trim()) {
        profileUpdate.full_name = stripeName.trim();
      }
      const { error: profileError } = await db
        .from("profiles")
        .update(profileUpdate)
        .eq("id", userIdFinal);
      if (profileError) {
        console.error("[webhook] profiles update failed", profileError);
      } else {
        console.log("[webhook] checkout.session.completed: granted 45 credits + active for user", userIdFinal, isFoundingFinal ? "(founding member)" : "", createdForGuestFinal ? "(guest, sending magic link)" : "");
        try {
          await queueEmail({
            to_email: null,
            template: "payment_success_v1",
            payload: { member_id: userIdFinal },
            dedupe_key: `payment_success:${session.id}`,
          });
        } catch (e) {
          console.warn("[webhook] queueEmail payment_success_v1 failed", e);
        }
        if (createdForGuestFinal && guestEmail) {
          try {
            const { data: linkData } = await db.auth.admin.generateLink({
              type: "magiclink",
              email: guestEmail,
              options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://themomops.com"}/member` },
            });
            const magicLink = linkData?.properties?.action_link as string | undefined;
            if (magicLink) {
              await queueEmail({
                to_email: null,
                template: "account_ready_magic_link_v1",
                payload: { member_id: userIdFinal, magic_link: magicLink },
                dedupe_key: `account_ready_magic:${session.id}`,
              });
            }
          } catch (e) {
            console.warn("[webhook] generateLink or queue account_ready_magic_link_v1 failed", e);
          }
        }
      }
    });

    return NextResponse.json({ received: true });
  } else if (event.type === "invoice.paid") {
    const invoice = event.data.object as InvoiceWithSubscription;
    // Only grant credits on subscription renewal (first invoice is handled by checkout.session.completed)
    if (invoice.billing_reason !== "subscription_cycle") {
      return NextResponse.json({ received: true, skipped: "not a renewal" });
    }
    const subscriptionId: string | null =
      (typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id) ??
      invoice.subscription_details?.subscription ??
      null;
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
    try {
      await queueEmail({
        to_email: null,
        template: "subscription_canceled_v1",
        payload: { member_id: userId },
        dedupe_key: `subscription_canceled:${userId}:${event.id}`,
      });
    } catch (e) {
      console.warn("[webhook] queueEmail subscription_canceled_v1 failed", e);
    }
  } else if (event.type === "invoice.payment_failed") {
    if (await claimEvent(supabase, event.id)) {
      return NextResponse.json({ received: true, idempotent: true });
    }
    const invoice = event.data.object as InvoiceWithSubscription;
    const subscriptionId: string | null =
      (typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id) ??
      invoice.subscription_details?.subscription ??
      null;
    let userId: string | null = null;
    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        userId = subscription.metadata?.user_id ?? null;
      } catch {
        // ignore
      }
    }
    if (!userId && invoice.customer) {
      const custId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (custId) {
        const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const customer = await stripe.customers.retrieve(custId);
        const email = (customer as Stripe.Customer).email;
        if (email && users?.length) {
          const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
          if (match) userId = match.id;
        }
      }
    }
    if (userId) {
      try {
        await queueEmail({
          to_email: null,
          template: "payment_failed_v1",
          payload: { member_id: userId },
          dedupe_key: `payment_failed:${invoice.id}`,
        });
      } catch (e) {
        console.warn("[webhook] queueEmail payment_failed_v1 failed", e);
      }
    }
  }

  return NextResponse.json({ received: true });
}
