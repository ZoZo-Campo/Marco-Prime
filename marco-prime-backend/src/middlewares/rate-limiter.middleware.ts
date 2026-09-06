import type { MiddlewareHandler } from "hono";
import { rateLimiter } from "hono-rate-limiter";

const rateLimiterInstance = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 100, // max 10 requests per minute per IP
  standardHeaders: "draft-7", // Return rate limit info in the `RateLimit-*` headers
  keyGenerator: (c) => {
    // Use IP address as the key for rate limiting
    return (
      c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown"
    );
  },
});

// Conditional middleware that skips rate limiting in test environment
export const limiter: MiddlewareHandler = async (c, next) => {
  if (process.env.NODE_ENV === "test") {
    return next();
  }
  return rateLimiterInstance(c, next);
};
