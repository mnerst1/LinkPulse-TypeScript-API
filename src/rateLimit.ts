import type { RequestHandler } from "express";

type Bucket = { count: number; resetAt: number };

export function createRateLimiter(limit: number, windowMs: number): RequestHandler {
  const buckets = new Map<string, Bucket>();

  return (request, response, next) => {
    const key = request.ip ?? "unknown";
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    existing.count += 1;
    response.setHeader("RateLimit-Limit", String(limit));
    response.setHeader("RateLimit-Remaining", String(Math.max(0, limit - existing.count)));
    response.setHeader("RateLimit-Reset", String(Math.ceil(existing.resetAt / 1000)));

    if (existing.count > limit) {
      return response.status(429).json({ error: "Too many requests. Try again later." });
    }

    next();
  };
}
