import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MIN_CENTS = 100;   // $1.00
const MAX_CENTS = 2500;  // $25.00

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task_id: taskId, amount_cents: amountCents } = body as { task_id?: string; amount_cents?: number };

    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json({ error: "task_id is required" }, { status: 400 });
    }
    const cents = amountCents != null ? Number(amountCents) : NaN;
    if (!Number.isInteger(cents) || cents < MIN_CENTS || cents > MAX_CENTS) {
      return NextResponse.json(
        { error: `amount_cents must be between ${MIN_CENTS} and ${MAX_CENTS}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: ticket } = await supabase
      .from("tickets")
      .select("id, member_id, assigned_va_id, subject, status")
      .eq("id", taskId)
      .single();

    if (!ticket || ticket.member_id !== user.id) {
      return NextResponse.json({ error: "Task not found or not yours" }, { status: 404 });
    }
    if (ticket.status !== "completed" && ticket.status !== "closed") {
      return NextResponse.json({ error: "Task must be completed or closed to add a tip" }, { status: 400 });
    }
    if (!ticket.assigned_va_id) {
      return NextResponse.json({ error: "Task has no assigned specialist" }, { status: 400 });
    }

    const { data: existingTip } = await supabase
      .from("task_tips")
      .select("id")
      .eq("task_id", taskId)
      .maybeSingle();
    if (existingTip) {
      return NextResponse.json({ error: "A tip was already sent for this task" }, { status: 400 });
    }

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
              name: "Tip for your specialist",
              description: "Buy your VA a coffee — 100% goes to your Mom Ops Specialist.",
              images: [],
            },
          },
        },
      ],
      success_url: `${siteUrl}/member/${taskId}?tip=success`,
      cancel_url: `${siteUrl}/member/${taskId}?tip=cancel`,
      client_reference_id: user.id,
      metadata: {
        mode: "task_tip",
        task_id: taskId,
        va_id: ticket.assigned_va_id,
        member_id: user.id,
        amount_cents: String(cents),
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
    const message = err instanceof Error ? err.message : "Checkout failed";
    console.error("[stripe/checkout/tip]", message, err);
    return NextResponse.json(
      { error: message, code: "CHECKOUT_ERROR" },
      { status: 500 }
    );
  }
}
