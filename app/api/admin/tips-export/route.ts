import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { data: rows } = await supabase
    .from("task_tips")
    .select("id, task_id, va_id, member_id, amount, stripe_payment_intent_id, created_at")
    .order("created_at", { ascending: false });

  const header = "task_id,va_id,member_id,amount_usd,stripe_payment_intent_id,created_at\n";
  const lines = (rows ?? []).map(
    (r) =>
      `${r.task_id},${r.va_id},${r.member_id},${r.amount},${r.stripe_payment_intent_id ?? ""},${r.created_at ?? ""}`
  );
  const csv = header + lines.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="task-tips-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
