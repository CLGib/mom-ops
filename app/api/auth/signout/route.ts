import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const origin = request.nextUrl.origin;
  const next = request.nextUrl.searchParams.get("next");
  const redirectUrl = next
    ? new URL(`/login?next=${encodeURIComponent(next)}`, origin)
    : new URL("/", origin);
  return NextResponse.redirect(redirectUrl, 302);
}
