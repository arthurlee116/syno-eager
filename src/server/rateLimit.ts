import type { VercelRequest } from "@vercel/node";

export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const RATE_LIMIT_MAX_REQUESTS = 20;

type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const ipBuckets = new Map<string, Bucket>();
let lastCleanupAt = 0;

function normalizeIp(ip: string): string {
  return ip.trim().replace(/^\[(.*)\]$/, "$1");
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function cleanupOldBuckets(now: number): void {
  const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
  const MAX_IDLE_AGE_MS = RATE_LIMIT_WINDOW_MS * 2;

  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;

  for (const [ip, bucket] of ipBuckets.entries()) {
    if (now - bucket.resetAt > MAX_IDLE_AGE_MS) {
      ipBuckets.delete(ip);
    }
  }
}

export function extractClientIp(req: Pick<VercelRequest, "headers" | "socket">): string {
  const forwardedFor = firstHeaderValue(req.headers["x-forwarded-for"]);
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0];
    if (firstIp?.trim()) return normalizeIp(firstIp);
  }

  const realIp = firstHeaderValue(req.headers["x-real-ip"]);
  if (realIp?.trim()) return normalizeIp(realIp);

  const vercelForwarded = firstHeaderValue(req.headers["x-vercel-forwarded-for"]);
  if (vercelForwarded?.trim()) return normalizeIp(vercelForwarded);

  const remote = req.socket?.remoteAddress;
  if (remote?.trim()) return normalizeIp(remote);

  return "unknown";
}

export function checkIpRateLimit(ip: string, now = Date.now()): RateLimitDecision {
  cleanupOldBuckets(now);

  const key = ip || "unknown";
  const existing = ipBuckets.get(key);

  const bucket: Bucket =
    existing && now < existing.resetAt
      ? existing
      : { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  const overLimit = bucket.count >= RATE_LIMIT_MAX_REQUESTS;
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  if (overLimit) {
    ipBuckets.set(key, bucket);
    return {
      allowed: false,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterSeconds,
    };
  }

  bucket.count += 1;
  ipBuckets.set(key, bucket);

  return {
    allowed: true,
    limit: RATE_LIMIT_MAX_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - bucket.count),
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

export function resetIpRateLimitStore(): void {
  ipBuckets.clear();
  lastCleanupAt = 0;
}
