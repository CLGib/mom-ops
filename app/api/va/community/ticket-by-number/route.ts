import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/va/community/ticket-by-number?numbers=123,456
 * Resolve ticket numbers to ticket ids for tickets the current VA can access
 * (assigned to them or unassigned/new). Returns { "123": "uuid", "456": "uuid" }.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (roleRow?.role !== "va") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const numbersParam = request.nextUrl.searchParams.get("numbers");
  if (!numbersParam || !numbersParam.trim()) {
    return NextResponse.json({});
  }
  const numbers = numbersParam
    .split(",")
    .map((n) => parseInt(n.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (numbers.length === 0) {
    return NextResponse.json({});
  }

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, ticket_number")
    .in("ticket_number", numbers)
    .or(`assigned_va_id.eq.${user.id},and(status.eq.new,assigned_va_id.is.null)`);

  const out: Record<string, string> = {};
  for (const t of tickets ?? []) {
    if (t.ticket_number != null) {
      out[String(t.ticket_number)] = t.id;
    }
  }
  return NextResponse.json(out);
}
