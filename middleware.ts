import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          const { maxAge, ...rest } = options;
          const cookie = { name, value, ...rest, ...(maxAge !== undefined && { maxAge }) };
          request.cookies.set(cookie);
          response = NextResponse.next({ request });
          response.cookies.set(cookie);
        },
        remove(name: string, options: CookieOptions) {
          const { maxAge, ...rest } = options;
          const cookie = { name, value: "", ...rest, ...(maxAge !== undefined && { maxAge }) };
          request.cookies.set(cookie);
          response = NextResponse.next({ request });
          response.cookies.set(cookie);
        },
      },
    }
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/va/:path*", "/member/:path*", "/login", "/"],
};
