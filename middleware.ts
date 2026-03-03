import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimitMemory, getClientIp } from "@/lib/rate-limit-memory";

type Role = "member" | "va" | "admin" | "director" | "cfo";

function dashboardForRole(role: Role): string {
  if (role === "member") return "/member";
  if (role === "va") return "/va";
  if (role === "admin") return "/admin";
  if (role === "director") return "/director";
  if (role === "cfo") return "/cfo";
  return "/member";
}

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

    // API routes: defense-in-depth — require auth for non-public APIs; return JSON, never redirect
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
      const { data: apiRoleRow } = await apiSupabase
        .from("user_roles")
        .select("role")
        .eq("user_id", apiUser.id)
        .maybeSingle();
      const apiRole = apiRoleRow?.role as Role | undefined;
      if (path.startsWith("/api/admin/") && apiRole !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.next();
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return NextResponse.next();

    const res = NextResponse.next({ request: req });
    const pathWithQuery = req.nextUrl.pathname + req.nextUrl.search;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user ?? null;

    if (!user) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathWithQuery);
      return NextResponse.redirect(loginUrl);
    }

    // Fetch role for THIS user
    const { data: roleRow, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (process.env.NODE_ENV === "development" && roleErr) {
      console.warn("[middleware] user_roles fetch:", roleErr.message);
    }

    const role = (roleRow?.role as Role | undefined) ?? null;

    const allowedRoles: Role[] = ["member", "va", "admin", "director", "cfo"];
    if (roleErr || !role || !allowedRoles.includes(role)) {
      // Authenticated but missing role -> send to dedicated page (avoid login loop)
      const noAccessUrl = req.nextUrl.clone();
      noAccessUrl.pathname = "/no-access";
      noAccessUrl.searchParams.set("reason", "role_not_set");
      return NextResponse.redirect(noAccessUrl);
    }

    // Enforce route by role (page routes only)
    if (path.startsWith("/member")) {
      if (role !== "member" && role !== "admin") {
        return NextResponse.redirect(new URL(dashboardForRole(role), req.url));
      }
      return res;
    }

    if (path.startsWith("/va")) {
      if (role !== "va" && role !== "admin") {
        return NextResponse.redirect(new URL(dashboardForRole(role), req.url));
      }
      return res;
    }

    if (path.startsWith("/admin")) {
      if (role !== "admin") {
        return NextResponse.redirect(new URL(dashboardForRole(role), req.url));
      }
      return res;
    }

    if (path.startsWith("/director")) {
      if (role !== "director" && role !== "admin") {
        return NextResponse.redirect(new URL(dashboardForRole(role), req.url));
      }
      return res;
    }

    if (path.startsWith("/cfo")) {
      if (role !== "cfo" && role !== "admin") {
        return NextResponse.redirect(new URL(dashboardForRole(role), req.url));
      }
      return res;
    }

    return res;
  } catch (err) {
    console.error("middleware error:", err);
    return NextResponse.next();
  }
}

/** API paths that do not require authentication (webhooks, public read-only, guest checkout, cron jobs, etc.) */
const PUBLIC_API_PREFIXES = ["/api/webhooks/", "/api/founders/count", "/api/stripe/checkout", "/api/jobs/"];

function isPublicApiPath(path: string): boolean {
  if (!path.startsWith("/api")) return false;
  return PUBLIC_API_PREFIXES.some((prefix) => path.startsWith(prefix) || path === "/api/founders/count");
}

export const config = {
  matcher: [
    "/login",
    "/member/:path*",
    "/va/:path*",
    "/admin/:path*",
    "/director/:path*",
    "/cfo/:path*",
    "/api/:path*",
  ],
};
