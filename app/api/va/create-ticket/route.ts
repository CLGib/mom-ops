import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
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

  let body: {
    memberId?: string;
    subject?: string;
    description?: string | null;
    creditCost?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const memberId = typeof body.memberId === "string" ? body.memberId.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() || null : null;
  const creditCost =
    typeof body.creditCost === "number" && body.creditCost >= 0 ? body.creditCost : undefined;

  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }
  if (!subject) {
    return NextResponse.json({ error: "subject is required" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: memberProfile } = await service
    .from("profiles")
    .select("id, role")
    .eq("id", memberId)
    .single();
  if (!memberProfile || memberProfile.role !== "member") {
    return NextResponse.json({ error: "Member not found" }, { status: 400 });
  }

  const insertPayload: {
    member_id: string;
    subject: string;
    description: string | null;
    status: string;
    assigned_va_id: string;
    credit_cost?: number;
  } = {
    member_id: memberId,
    subject,
    description,
    status: "assigned",
    assigned_va_id: user.id,
  };
  if (creditCost !== undefined) {
    insertPayload.credit_cost = creditCost;
  }

  const { data: ticket, error } = await service
    .from("tickets")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!ticket?.id) {
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ticketId: ticket.id });
}
