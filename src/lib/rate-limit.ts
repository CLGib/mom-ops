/**
 * Rate limiting for API routes and login page.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 * Falls back to in-memory (per-instance) when not configured (e.g. local dev).
 */

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  limit: number;
  reset: number;
};

export type RateLimitConfig = {
  /** Max requests per window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
};

/** In-memory store for dev fallback (per-instance, not shared across serverless) */
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function getMemoryLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = `${identifier}:${config.limit}:${config.windowSeconds}`;
  const entry = memoryStore.get(key);

  if (!entry) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      remaining: config.limit - 1,
      limit: config.limit,
      reset: Math.ceil((now + windowMs) / 1000),
    };
  }

  if (now >= entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      remaining: config.limit - 1,
      limit: config.limit,
      reset: Math.ceil((now + windowMs) / 1000),
    };
  }

  const newCount = entry.count + 1;
  memoryStore.set(key, { ...entry, count: newCount });

  if (newCount > config.limit) {
    return {
      success: false,
      remaining: 0,
      limit: config.limit,
      reset: Math.ceil(entry.resetAt / 1000),
    };
  }

  return {
    success: true,
    remaining: config.limit - newCount,
    limit: config.limit,
    reset: Math.ceil(entry.resetAt / 1000),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ratelimitCache = new Map<string, any>();

async function getUpstashRatelimit(config: RateLimitConfig) {
  const cacheKey = `${config.limit}:${config.windowSeconds}`;
  const cached = ratelimitCache.get(cacheKey);
  if (cached) return cached;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const rl = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
      analytics: false,
    });
    ratelimitCache.set(cacheKey, rl);
    return rl;
  } catch {
    return null;
  }
}

/**
 * Check rate limit. Returns { success: false } when over limit.
 * Use identifier: user.id for authenticated routes, or client IP for login page.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const ratelimit = await getUpstashRatelimit(config);

  if (ratelimit) {
    try {
      const result = await ratelimit.limit(identifier);
      return {
        success: result.success,
        remaining: result.remaining,
        limit: result.limit,
        reset: Math.ceil(result.reset / 1000), // convert ms to seconds for Retry-After
      };
    } catch (err) {
      console.warn("[rate-limit] Upstash error, falling back to memory:", err);
    }
  }

  return getMemoryLimit(identifier, config);
}

/** Get client IP from request (Vercel, etc.) */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

/** Presets for common rate limit configs */
export const RATE_LIMITS = {
  /** AI expand: expensive Anthropic calls */
  tasksExpand: { limit: 10, windowSeconds: 60 },
  /** Feedback submissions */
  feedback: { limit: 10, windowSeconds: 60 },
  /** NPS responses */
  nps: { limit: 5, windowSeconds: 60 },
  /** Ticket creation */
  tickets: { limit: 20, windowSeconds: 60 },
  /** Stripe checkout (tip, credits) */
  stripeCheckout: { limit: 10, windowSeconds: 60 },
  /** VA assistant: draft + tips */
  vaAssistant: { limit: 20, windowSeconds: 3600 },
} as const;
