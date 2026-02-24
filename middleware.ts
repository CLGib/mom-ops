import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Fail open if env not set so prod never goes down
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.next();
    }

    let res = NextResponse.next({ request: req });

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
      loginUrl.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
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
