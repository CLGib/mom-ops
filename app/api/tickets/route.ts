import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

import { createClient as createServerClientFromCookies } from "@/lib/supabase/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Try request cookies first (what the client sent)
    let serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    });
    let { data: { user } } = await serverClient.auth.getUser();

    // Fallback: use next/headers cookies() — on Vercel it sometimes has the session when request.cookies doesn't
    if (!user) {
      const serverClientAlt = await createServerClientFromCookies();
      const { data } = await serverClientAlt.auth.getUser();
      user = data.user ?? undefined;
    }

    if (!user) {
      const cookieCount = request.cookies.getAll().length;
      const hasAuthCookie = request.cookies
        .getAll()
        .some((c) => c.name.includes("supabase") || c.name.includes("sb-"));
      return NextResponse.json(
        {
          error: "Not logged in.",
          debug: {
            cookieCount,
            hasAuthCookie,
            hint:
              cookieCount === 0
                ? "No cookies sent with request — check credentials: 'include' and same origin."
                : !hasAuthCookie
                  ? "Cookies sent but no Supabase auth cookie. Log in again; if it persists, check Supabase Auth URL config uses themomops.com."
                  : "Auth cookie sent but getUser() returned null — session may be expired or invalid.",
          },
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() || null : null;
    if (!subject) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

    const supabase = createClient(url, serviceKey);
    const { data: ticket, error } = await supabase
      .from("tickets")
      .insert({
        member_id: user.id,
        subject,
        description,
        status: "new",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const id = ticket?.id;
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Failed to create task." },
        { status: 500 }
      );
    }
    return NextResponse.json({ ticketId: id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
