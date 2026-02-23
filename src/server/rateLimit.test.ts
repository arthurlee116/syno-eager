import { describe, expect, it, beforeEach } from "vitest";
import type { VercelRequest } from "@vercel/node";
import {
  checkIpRateLimit,
  extractClientIp,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  resetIpRateLimitStore,
} from "./rateLimit";

type RateLimitReq = Pick<VercelRequest, "headers" | "socket">;

describe("checkIpRateLimit", () => {
  beforeEach(() => {
    resetIpRateLimitStore();
  });

  it("allows the first 20 requests in one hour", () => {
    const now = Date.now();
    let decision = checkIpRateLimit("203.0.113.10", now);

    for (let i = 1; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      decision = checkIpRateLimit("203.0.113.10", now);
      expect(decision.allowed).toBe(true);
    }

    expect(decision.allowed).toBe(true);
    expect(decision.remaining).toBe(0);
  });

  it("blocks the 21st request in one hour", () => {
    const now = Date.now();

    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      const allowed = checkIpRateLimit("198.51.100.99", now);
      expect(allowed.allowed).toBe(true);
    }

    const blocked = checkIpRateLimit("198.51.100.99", now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets the bucket after one hour", () => {
    const now = Date.now();
    const ip = "198.18.0.1";

    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      checkIpRateLimit(ip, now);
    }

    const blocked = checkIpRateLimit(ip, now);
    expect(blocked.allowed).toBe(false);

    const nextWindow = checkIpRateLimit(ip, now + RATE_LIMIT_WINDOW_MS + 1);
    expect(nextWindow.allowed).toBe(true);
    expect(nextWindow.remaining).toBe(RATE_LIMIT_MAX_REQUESTS - 1);
  });
});

describe("extractClientIp", () => {
  it("prefers x-forwarded-for and picks the first IP", () => {
    const ip = extractClientIp({
      headers: { "x-forwarded-for": "203.0.113.5, 198.51.100.1" },
      socket: { remoteAddress: "10.0.0.1" },
    } as unknown as RateLimitReq);

    expect(ip).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip then socket remote address", () => {
    const fromRealIp = extractClientIp({
      headers: { "x-real-ip": "198.51.100.77" },
      socket: { remoteAddress: "10.0.0.1" },
    } as unknown as RateLimitReq);
    expect(fromRealIp).toBe("198.51.100.77");

    const fromSocket = extractClientIp({
      headers: {},
      socket: { remoteAddress: "10.0.0.2" },
    } as unknown as RateLimitReq);
    expect(fromSocket).toBe("10.0.0.2");
  });
});
