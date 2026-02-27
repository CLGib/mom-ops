import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Temporary: log what triggered signout (do NOT log tokens)
  const referer = request.headers.get("referer") ?? "(none)";
  const host = request.headers.get("host") ?? "(none)";
  const pathname = request.nextUrl.pathname;
  console.warn("[signout] GET", { referer, host, pathname });

  const supabase = await createClient();
  await supabase.auth.signOut();
  // Redirect to same origin so sign-out never sends users to the wrong domain (e.g. vercel.app)
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(new URL("/", origin), 302);
}
