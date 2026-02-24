import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const amount = typeof body.amount === "number" ? body.amount : parseInt(String(body.amount), 10);
  if (!email) {
    return NextResponse.json(
      { error: "email is required" },
      { status: 400 }
    );
  }
  if (Number.isNaN(amount) || amount === 0) {
    return NextResponse.json(
      { error: "amount must be a non-zero integer" },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }
  const serviceSupabase = createServiceClient(url, serviceKey);
  const {
    data: { users },
  } = await serviceSupabase.auth.admin.listUsers({ perPage: 1000 });
  const member = users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  if (!member) {
    return NextResponse.json(
      { error: "No user found with that email" },
      { status: 404 }
    );
  }

  const { error: insertError } = await supabase
    .from("credit_transactions")
    .insert({
      member_id: member.id,
      amount,
      type: "admin_adjustment",
    });
  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    member_id: member.id,
    email: member.email,
    amount,
  });
}
