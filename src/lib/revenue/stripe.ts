/**
 * Server-only: Stripe revenue fetching and categorization for the revenue dashboard.
 * Uses in-memory cache (15 min TTL). Call with refresh=true to bust cache.
 */
import Stripe from "stripe";

export type RevenueCategory = "new_signup" | "recurring" | "credit_purchase" | "refund";

export type RevenueTransaction = {
  id: string;
  amount_cents: number;
  amount_dollars: number;
  currency: string;
  created: number;
  customer_id: string | null;
  customer_email: string | null;
  description: string | null;
  invoice_id: string | null;
  subscription_id: string | null;
  category: RevenueCategory;
  refunded: boolean;
  refund_amount_cents: number;
  metadata: Record<string, string>;
};

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min
let cachedTransactions: RevenueTransaction[] | null = null;
let cacheTimestamp = 0;

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

function isCacheValid(): boolean {
  return cachedTransactions !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS;
}

export function clearRevenueCache(): void {
  cachedTransactions = null;
  cacheTimestamp = 0;
}

/** Fetch and categorize Stripe revenue. Uses cache unless refresh=true. */
export async function getStripeRevenue(options: {
  month?: string; // YYYY-MM
  refresh?: boolean;
}): Promise<{ transactions: RevenueTransaction[]; fromCache: boolean }> {
  if (options.refresh) clearRevenueCache();
  if (isCacheValid() && !options.month) {
    return { transactions: cachedTransactions!, fromCache: true };
  }

  const stripe = getStripe();
  const { month } = options;
  let gte: number;
  let lte: number;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    gte = Math.floor(new Date(y, m - 1, 1).getTime() / 1000);
    lte = Math.floor(new Date(y, m, 0, 23, 59, 59).getTime() / 1000);
  } else {
    // Last 12 months
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
    gte = Math.floor(start.getTime() / 1000);
    lte = Math.floor(end.getTime() / 1000);
  }

  const transactions: RevenueTransaction[] = [];
  const seenCustomers = new Set<string>();

  // 1. List charges (paginated)
  // Use amount_refunded from the charge (always present); refunds.data is often not populated when listing.
  for await (const charge of stripe.charges.list({
    created: { gte, lte },
    limit: 100,
  })) {
    if (charge.status !== "succeeded") continue;
    const amount = charge.amount;
    const refundTotal = charge.refunded ? (charge.amount_refunded ?? 0) : 0;
    const invoiceId = (charge as Stripe.Charge & { invoice?: string | null }).invoice;
    const subscriptionId = invoiceId; // Invoice present => subscription revenue; we don't fetch invoice for perf

    let category: RevenueCategory = "credit_purchase";
    if (charge.refunded && amount === refundTotal) {
      category = "refund";
    } else if (charge.metadata?.type === "new_signup" || charge.metadata?.category === "new_signup") {
      category = "new_signup";
    } else if (charge.metadata?.type === "credit_purchase" || charge.metadata?.category === "credit_purchase") {
      category = "credit_purchase";
    } else if (subscriptionId) {
      category = "recurring";
    } else if (!charge.customer || !seenCustomers.has(charge.customer as string)) {
      category = "new_signup";
    }
    if (charge.customer) seenCustomers.add(charge.customer as string);

    transactions.push({
      id: charge.id,
      amount_cents: amount,
      amount_dollars: amount / 100,
      currency: charge.currency,
      created: charge.created,
      customer_id: charge.customer as string | null,
      customer_email: charge.billing_details?.email ?? null,
      description: charge.description ?? null,
      invoice_id: invoiceId ?? null,
      subscription_id: subscriptionId ?? null,
      category,
      refunded: charge.refunded,
      refund_amount_cents: refundTotal,
      metadata: (charge.metadata as Record<string, string>) ?? {},
    });
  }

  // 2. Refunds that aren't tied to a charge we already have (standalone refunds)
  for await (const refund of stripe.refunds.list({ created: { gte, lte }, limit: 100 })) {
    if (refund.charge && transactions.some((t) => t.id === refund.charge)) continue;
    transactions.push({
      id: refund.id,
      amount_cents: -(refund.amount ?? 0),
      amount_dollars: -((refund.amount ?? 0) / 100),
      currency: refund.currency ?? "usd",
      created: refund.created,
      customer_id: null,
      customer_email: null,
      description: refund.reason ?? "Refund",
      invoice_id: null,
      subscription_id: null,
      category: "refund",
      refunded: true,
      refund_amount_cents: refund.amount ?? 0,
      metadata: {},
    });
  }

  if (!options.month) {
    cachedTransactions = transactions;
    cacheTimestamp = Date.now();
  }

  return { transactions, fromCache: false };
}

/** Fetch total Stripe processing fees (in dollars) for a given month (YYYY-MM). */
export async function getStripeFeesForMonth(month: string): Promise<number> {
  const [y, m] = month.split("-").map(Number);
  const gte = Math.floor(new Date(y, m - 1, 1).getTime() / 1000);
  const lte = Math.floor(new Date(y, m, 0, 23, 59, 59).getTime() / 1000);
  const stripe = getStripe();
  let totalFeeCents = 0;
  for await (const bt of stripe.balanceTransactions.list({
    created: { gte, lte },
    limit: 100,
    type: "charge",
  })) {
    totalFeeCents += bt.fee ?? 0;
  }
  for await (const bt of stripe.balanceTransactions.list({
    created: { gte, lte },
    limit: 100,
    type: "refund",
  })) {
    totalFeeCents += bt.fee ?? 0;
  }
  return totalFeeCents / 100;
}

/** Net amount for a transaction (charge minus refund). */
function netDollars(t: RevenueTransaction): number {
  return t.amount_dollars - t.refund_amount_cents / 100;
}

/** Aggregate by category for a given month (YYYY-MM). Net = charge minus refunds. */
export function aggregateByCategory(
  transactions: RevenueTransaction[],
  month: string
): Record<RevenueCategory, number> {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1).getTime() / 1000;
  const end = new Date(y, m, 0, 23, 59, 59).getTime() / 1000;
  const out: Record<RevenueCategory, number> = {
    new_signup: 0,
    recurring: 0,
    credit_purchase: 0,
    refund: 0,
  };
  for (const t of transactions) {
    if (t.created >= start && t.created <= end) {
      out[t.category] += netDollars(t);
    }
  }
  return out;
}

/** Monthly totals for last 12 months (for chart). */
export function monthlyTotals(transactions: RevenueTransaction[]): { month: string; totals: Record<RevenueCategory, number> }[] {
  const months: { month: string; totals: Record<RevenueCategory, number> }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1).getTime() / 1000;
    const end = new Date(y, m, 0, 23, 59, 59).getTime() / 1000;
    const totals: Record<RevenueCategory, number> = {
      new_signup: 0,
      recurring: 0,
      credit_purchase: 0,
      refund: 0,
    };
    for (const t of transactions) {
      if (t.created >= start && t.created <= end) totals[t.category] += netDollars(t);
    }
    months.push({ month, totals });
  }
  return months;
}
