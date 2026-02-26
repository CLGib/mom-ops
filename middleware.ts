import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type Role = "member" | "va" | "admin";

function dashboardForRole(role: Role): string {
  return role === "member" ? "/member" : role === "va" ? "/va" : "/admin";
}

export async function middleware(req: NextRequest) {
  try {
    // Let server action POSTs through; they authenticate via token in the action
    const nextAction = req.headers.get("next-action") ?? req.headers.get("Next-Action");
    if (req.method === "POST" && nextAction) {
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

    if (roleErr || !role || !["member", "va", "admin"].includes(role)) {
      // Authenticated but missing role -> send to dedicated page (avoid login loop)
      const noAccessUrl = req.nextUrl.clone();
      noAccessUrl.pathname = "/no-access";
      noAccessUrl.searchParams.set("reason", "role_not_set");
      return NextResponse.redirect(noAccessUrl);
    }

    // Enforce route by role
    const path = req.nextUrl.pathname;

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

    return res;
  } catch (err) {
    console.error("middleware error:", err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/member/:path*", "/va/:path*", "/admin/:path*"],
};
