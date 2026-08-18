import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { queueEmail } from "@/lib/email/queue";
import { getPostHogClient } from "@/lib/posthog-server";
import { findUserIdByEmail } from "@/lib/find-user";

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

    if (session.metadata?.mode === "kit_purchase") {
      const kitId = session.metadata.kit_id as string | undefined;
      if (!kitId) {
        return NextResponse.json({ received: true, skipped: "no kit_id" });
      }
      const db = getSupabase();
      const email =
        session.customer_email ||
        (session.customer_details?.email as string | undefined) ||
        undefined;

      // Resolve or create the buyer (mirrors the subscription guest flow).
      let buyerId =
        (session.client_reference_id as string) || (session.metadata?.member_id as string | undefined);
      let createdGuest = false;
      if (!buyerId && email) {
        const existingId = await findUserIdByEmail(db, email);
        if (existingId) {
          buyerId = existingId;
        } else {
          const randomPassword = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
          const { data: newUser, error: createErr } = await db.auth.admin.createUser({
            email,
            password: randomPassword,
            email_confirm: true,
          });
          if (createErr || !newUser?.user?.id) {
            console.error("[webhook] createUser for kit guest failed", createErr);
            return NextResponse.json({ received: true, skipped: "could not create user" });
          }
          buyerId = newUser.user.id;
          createdGuest = true;
        }
      }
      if (!buyerId) {
        return NextResponse.json({ received: true, skipped: "no user for kit_purchase" });
      }

      const { error: ownErr } = await db.from("kit_purchases").insert({
        member_id: buyerId,
        kit_id: kitId,
        stripe_session_id: session.id,
      });
      if (ownErr && ownErr.code !== "23505") {
        console.error("[webhook] kit_purchases insert failed", ownErr);
        return NextResponse.json({ received: true, error: "kit_purchases insert failed" });
      }

      const customerId = typeof session.customer === "string" ? session.customer : null;
      if (customerId) {
        await db.from("profiles").update({ stripe_customer_id: customerId }).eq("id", buyerId);
      }

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://themomops.com";
      if (createdGuest && email) {
        try {
          const { data: linkData } = await db.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: { redirectTo: `${siteUrl}/kits/${kitId}/customize` },
          });
          const magicLink = linkData?.properties?.action_link as string | undefined;
          if (magicLink) {
            await queueEmail({
              to_email: email,
              template: "account_ready_magic_link_v1",
              payload: { member_id: buyerId, magic_link: magicLink },
              dedupe_key: `kit_ready_magic:${session.id}`,
            });
          }
        } catch (e) {
          console.warn("[webhook] kit guest magic link failed", e);
        }
      }
      console.log("[webhook] kit_purchase: granted kit", kitId, createdGuest ? "(guest)" : "");
      return NextResponse.json({ received: true, handled: "kit_purchase" });
    }

    if (session.metadata?.mode === "supporter") {
      const db = getSupabase();
      const email =
        session.customer_email ||
        (session.customer_details?.email as string | undefined) ||
        undefined;

      // Resolve or create the supporter (mirrors the kit/guest flow).
      let supporterId =
        (session.client_reference_id as string) || (session.metadata?.user_id as string | undefined);
      let createdGuest = false;
      if (!supporterId && email) {
        const existingId = await findUserIdByEmail(db, email);
        if (existingId) {
          supporterId = existingId;
        } else {
          const randomPassword = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
          const { data: newUser, error: createErr } = await db.auth.admin.createUser({
            email,
            password: randomPassword,
            email_confirm: true,
          });
          if (createErr || !newUser?.user?.id) {
            console.error("[webhook] createUser for supporter failed", createErr);
            return NextResponse.json({ received: true, skipped: "could not create user" });
          }
          supporterId = newUser.user.id;
          createdGuest = true;
        }
      }
      if (!supporterId) {
        return NextResponse.json({ received: true, skipped: "no user for supporter" });
      }

      const customerId = typeof session.customer === "string" ? session.customer : null;
      const subId = typeof session.subscription === "string" ? session.subscription : null;
      // Stamp user_id on the subscription so renewal/cancel events resolve the user.
      if (subId) {
        try {
          await stripe.subscriptions.update(subId, { metadata: { mode: "supporter", user_id: supporterId } });
        } catch (e) {
          console.warn("[webhook] could not stamp supporter subscription metadata", e);
        }
      }
      // Active membership. Content access only, no task credits.
      const { error: profErr } = await db
        .from("profiles")
        .update({
          subscription_status: "active",
          ...(customerId ? { stripe_customer_id: customerId } : {}),
          ...(subId ? { stripe_subscription_id: subId } : {}),
        })
        .eq("id", supporterId);
      if (profErr) {
        console.error("[webhook] supporter profiles update failed", profErr);
        return NextResponse.json({ received: true, error: "supporter update failed" });
      }

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://themomops.com";
      if (createdGuest && email) {
        try {
          const { data: linkData } = await db.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: { redirectTo: `${siteUrl}/my-stuff` },
          });
          const magicLink = linkData?.properties?.action_link as string | undefined;
          if (magicLink) {
            await queueEmail({
              to_email: email,
              template: "account_ready_magic_link_v1",
              payload: { member_id: supporterId, magic_link: magicLink },
              dedupe_key: `supporter_ready_magic:${session.id}`,
            });
          }
        } catch (e) {
          console.warn("[webhook] supporter guest magic link failed", e);
        }
      }
      console.log("[webhook] supporter: active", createdGuest ? "(guest)" : "");
      return NextResponse.json({ received: true, handled: "supporter" });
    }

    // Only kit_purchase and supporter checkouts exist now. The legacy VA
    // membership / credit / tip checkouts have been retired.
    return NextResponse.json({ received: true, skipped: "unhandled checkout mode" });
  } else if (event.type === "invoice.paid") {
    // Supporter subscriptions remain active automatically on renewal, so there
    // is nothing to grant. (Legacy renewal credit grants have been retired.)
    return NextResponse.json({ received: true });
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
    try {
      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: userId,
        event: "subscription_canceled",
        properties: {
          stripe_subscription_id: subscription.id,
        },
      });
      posthog.identify({
        distinctId: userId,
        properties: { subscription_status: "canceled" },
      });
      await posthog.shutdown();
    } catch (e) {
      console.warn("[webhook] PostHog subscription_canceled capture failed", e);
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
        const customer = await stripe.customers.retrieve(custId);
        const email = (customer as Stripe.Customer).email;
        if (email) {
          userId = await findUserIdByEmail(supabase, email);
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
