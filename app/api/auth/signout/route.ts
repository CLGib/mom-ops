import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Redirect to same origin so sign-out never sends users to the wrong domain (e.g. vercel.app)
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(new URL("/", origin), 302);
}
