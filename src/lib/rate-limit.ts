import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const redis = Redis.fromEnv();

// Different limiters for different endpoints
export const rateLimiters = {
  /** Login: 5 attempts per 15 minutes per IP */
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "rl:login",
  }),
  /** Register: 3 attempts per hour per IP */
  register: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    prefix: "rl:register",
  }),
  /** Forgot password: 3 attempts per hour per key (email or IP) */
  forgotPassword: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    prefix: "rl:forgot",
  }),
  /** Verify email resend: 3 attempts per hour per key */
  verifyEmail: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    prefix: "rl:verify",
  }),
  /** Invitation: 10 per hour per tenant */
  invitation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "rl:invite",
  }),
};

/** Extract client IP from request headers */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/** Check rate limit — returns 429 response if exceeded, null if OK */
export async function checkRateLimit(
  limiter: Ratelimit,
  key: string
): Promise<NextResponse | null> {
  const { success, reset } = await limiter.limit(key);
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return NextResponse.json(
      { message: "Demasiados intentos. Intenta más tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }
  return null;
}
