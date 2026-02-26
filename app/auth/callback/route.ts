import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", requestUrl.origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.warn("[auth/callback] exchangeCodeForSession:", error.message);
    return NextResponse.redirect(new URL("/login?error=auth_failed", requestUrl.origin));
  }

  // Redirect to next if it's a safe same-origin path; if next is "/" send to /login so server can redirect by role
  const nextPath = next.startsWith("/") ? next : `/${next}`;
  const isHome = nextPath === "/" || nextPath === "";
  const targetPath = isHome ? "/login" : nextPath;
  const redirectUrl = new URL(targetPath, requestUrl.origin);
  if (redirectUrl.origin !== requestUrl.origin) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }
  return NextResponse.redirect(redirectUrl);
}
