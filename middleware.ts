import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type Role = "member" | "va" | "admin";

function dashboardForRole(role: Role): string {
  return role === "member" ? "/member" : role === "va" ? "/va" : "/admin";
}

export async function middleware(req: NextRequest) {
  try {
    // Let server action POSTs through; they authenticate via token in the action (R4)
    if (req.method === "POST" && req.headers.get("next-action")) {
      return NextResponse.next();
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.next();
    }

    let res = NextResponse.next({ request: req });
    const path = req.nextUrl.pathname;

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", path);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based access (R1, R2, R3): get role from user_roles (RLS allows own row)
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .maybeSingle();
    const role = (roleRow?.role as Role | undefined) ?? null;

    if (!role || !["member", "va", "admin"].includes(role)) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", path);
      loginUrl.searchParams.set("error", "role_not_set");
      return NextResponse.redirect(loginUrl);
    }

    // Enforce route by role
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
