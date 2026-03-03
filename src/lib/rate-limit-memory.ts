/**
 * In-memory rate limiting for Edge runtime (middleware).
 * Does not import Upstash - safe for Edge.
 */

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  limit: number;
  reset: number;
};

export type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
};

const memoryStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimitMemory(
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

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
