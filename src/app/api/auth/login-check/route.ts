import { NextRequest } from "next/server";
import { rateLimiters, getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(rateLimiters.login, getClientIp(req));
  if (limited) return limited;
  return Response.json({ ok: true });
}
