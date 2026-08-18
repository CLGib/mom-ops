import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimitMemory, getClientIp } from "@/lib/rate-limit-memory";

export async function middleware(req: NextRequest) {
  try {
    // Canonical domain: redirect www to apex so cookies stay on one host
    const host = req.nextUrl.hostname;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const apexHost = siteUrl ? new URL(siteUrl).hostname : "themomops.com";
    if (host === `www.${apexHost}`) {
      const url = req.nextUrl.clone();
      url.host = apexHost;
      url.protocol = "https:";
      return NextResponse.redirect(url, 308);
    }

    // Server action POSTs bypass middleware (Next.js sets next-action header). Each server action
    // must enforce auth itself via createClient() + getUser() and return error if unauthenticated.
    const nextAction = req.headers.get("next-action") ?? req.headers.get("Next-Action");
    if (req.method === "POST" && nextAction) {
      return NextResponse.next();
    }

    const path = req.nextUrl.pathname;

    // Login page: rate limit by IP to prevent abuse (magic link/password reset go through Supabase)
    if (path === "/login") {
      const ip = getClientIp(req);
      const result = checkRateLimitMemory(`login:${ip}`, {
        limit: 30,
        windowSeconds: 60,
      });
      if (!result.success) {
        const retryAfter = Math.max(1, result.reset - Math.floor(Date.now() / 1000));
        return new NextResponse(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Too many requests</title></head><body><h1>Too many requests</h1><p>Please wait ${retryAfter} seconds and try again.</p></body></html>`,
          {
            status: 429,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Retry-After": String(retryAfter),
            },
          }
        );
      }
      return NextResponse.next();
    }

    // API routes: defense-in-depth — require auth for non-public APIs; return JSON, never redirect.
    // Content pages (/my-stuff, /kits/*/customize) enforce their own auth in-page.
    if (path.startsWith("/api/") || path === "/api") {
      if (isPublicApiPath(path)) return NextResponse.next();

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) return NextResponse.next();

      const apiSupabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll() {},
        },
      });
      const { data: { user: apiUser } } = await apiSupabase.auth.getUser();
      if (!apiUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.next();
    }

    return NextResponse.next();
  } catch (err) {
    console.error("middleware error:", err);
    return NextResponse.next();
  }
}

/** API paths that do not require authentication (webhooks, guest checkout, cron jobs, newsletter signup). */
const PUBLIC_API_PREFIXES = ["/api/webhooks/", "/api/stripe/checkout", "/api/jobs/", "/api/subscribe", "/api/unsubscribe"];

function isPublicApiPath(path: string): boolean {
  if (!path.startsWith("/api")) return false;
  return PUBLIC_API_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export const config = {
  matcher: ["/login", "/api/:path*"],
};
