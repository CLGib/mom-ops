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

/** Result for daily cap check */
export type DailyCapResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
};

const DAILY_CAP_KEY_PREFIX = "tasks-expand-daily";
const AI_EXPAND_DAILY_CAP = 20;

/** In-memory store for daily cap when Redis is not available (key -> count) */
const dailyCapMemory = new Map<string, number>();

function getDateKey(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

function getSecondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.max(1, Math.min(86400 * 2, Math.ceil((midnight.getTime() - now.getTime()) / 1000)));
}

async function getRedis(): Promise<{ get: (key: string) => Promise<number | null>; incr: (key: string) => Promise<number>; expire: (key: string, seconds: number) => Promise<unknown> } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = Redis.fromEnv();
    return {
      get: async (key: string) => {
        const v = await redis.get<number>(key);
        return v == null ? null : Number(v);
      },
      incr: async (key: string) => {
        const v = await redis.incr(key);
        return Number(v);
      },
      expire: async (key: string, seconds: number) => redis.expire(key, seconds),
    };
  } catch {
    return null;
  }
}

/**
 * Check and increment a per-user daily cap (e.g. for AI expand).
 * Uses key prefix + userId + date (YYYY-MM-DD). Returns allowed=false when at or over cap.
 */
export async function checkAndIncrementDailyCap(
  userId: string,
  options: { keyPrefix?: string; cap?: number } = {}
): Promise<DailyCapResult> {
  const prefix = options.keyPrefix ?? DAILY_CAP_KEY_PREFIX;
  const cap = options.cap ?? AI_EXPAND_DAILY_CAP;
  const dateKey = getDateKey();
  const key = `${prefix}:${userId}:${dateKey}`;

  const redis = await getRedis();
  if (redis) {
    try {
      const current = await redis.get(key);
      if (current != null && current >= cap) {
        return { allowed: false, remaining: 0, limit: cap };
      }
      const newCount = await redis.incr(key);
      if (newCount === 1) {
        await redis.expire(key, getSecondsUntilMidnightUTC());
      }
      return {
        allowed: true,
        remaining: Math.max(0, cap - newCount),
        limit: cap,
      };
    } catch (err) {
      console.warn("[rate-limit] Redis daily cap error, falling back to memory:", err);
    }
  }

  const current = dailyCapMemory.get(key) ?? 0;
  if (current >= cap) {
    return { allowed: false, remaining: 0, limit: cap };
  }
  const newCount = current + 1;
  dailyCapMemory.set(key, newCount);
  return {
    allowed: true,
    remaining: Math.max(0, cap - newCount),
    limit: cap,
  };
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
  /** VA template generator */
  vaTemplateGenerator: { limit: 10, windowSeconds: 60 },
  /** VA mock-up generator (OpenAI image API) */
  vaMockupGenerator: { limit: 10, windowSeconds: 60 },
  /** VA book illustration generator */
  vaBookIllustrationGenerator: { limit: 10, windowSeconds: 60 },
  /** VA toolbox AI branding assistant (docx/sheet branding) */
  vaBrandingAssistant: { limit: 10, windowSeconds: 60 },
  /** VA application quiz submission (public, unauthenticated) */
  vaApply: { limit: 5, windowSeconds: 3600 },
} as const;
