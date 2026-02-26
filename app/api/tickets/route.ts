import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const serverClient = await createServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not logged in." }, { status: 401 });
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
