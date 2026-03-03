import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { queueEmail } from "@/lib/email/queue";

const CANCELLATION_REASONS = [
  "customer_request",
  "medical_emergency",
  "personal_emergency",
  "scope_outside_skillset",
  "duplicate_task",
  "incomplete_details",
  "system_technical",
  "other",
] as const;

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL or service role key not set");
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    ticket_id: string;
    reason: string;
    additional_notes?: string | null;
    other_explanation?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ticket_id, reason, additional_notes, other_explanation } = body;
  if (!ticket_id || typeof ticket_id !== "string") {
    return NextResponse.json({ error: "ticket_id is required" }, { status: 400 });
  }
  if (!reason || !CANCELLATION_REASONS.includes(reason as (typeof CANCELLATION_REASONS)[number])) {
    return NextResponse.json(
      { error: "reason must be one of: " + CANCELLATION_REASONS.join(", ") },
      { status: 400 }
    );
  }
  if (reason === "other") {
    const explanation = typeof other_explanation === "string" ? other_explanation.trim() : "";
    if (!explanation) {
      return NextResponse.json(
        { error: "other_explanation is required when reason is 'other'" },
        { status: 400 }
      );
    }
  }

  const service = getServiceSupabase();

  const { data: ticket, error: ticketError } = await service
    .from("tickets")
    .select("id, subject, status, member_id, assigned_va_id")
    .eq("id", ticket_id)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  const role = roleRow?.role ?? null;
  const isAdmin = role === "admin";
  const isAssignedVA = ticket.assigned_va_id === user.id;

  if (!isAdmin && !isAssignedVA) {
    return NextResponse.json(
      { error: "Only the assigned VA or an admin can cancel this task" },
      { status: 403 }
    );
  }

  const allowedStatuses = ["assigned", "in_progress"];
  if (!allowedStatuses.includes(ticket.status)) {
    return NextResponse.json(
      { error: "Task can only be cancelled when status is Assigned or In Progress" },
      { status: 400 }
    );
  }

  const cancelledBy = isAdmin ? "admin" : "va";
  const newStatus = isAdmin ? "cancelled_by_admin" : "cancelled_by_va";
  const notesParts: string[] = [];
  if (typeof additional_notes === "string" && additional_notes.trim()) {
    notesParts.push(additional_notes.trim());
  }
  if (reason === "other" && typeof other_explanation === "string" && other_explanation.trim()) {
    notesParts.push(`Other: ${other_explanation.trim()}`);
  }
  const cancellation_notes = notesParts.length > 0 ? notesParts.join("\n\n") : null;

  const { error: updateError } = await service
    .from("tickets")
    .update({
      status: newStatus,
      cancelled_by: cancelledBy,
      cancellation_reason: reason,
      cancellation_notes,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", ticket_id);

  if (updateError) {
    console.error("[va/cancel-task] ticket update failed", updateError);
    return NextResponse.json(
      { error: "Failed to cancel task" },
      { status: 500 }
    );
  }

  await service.from("audit_log").insert({
    user_id: user.id,
    action_type: "va_task_cancelled",
    affected_entity_type: "ticket",
    affected_entity_id: ticket_id,
    details: {
      cancelled_by: cancelledBy,
      cancellation_reason: reason,
      cancellation_notes,
      va_id: ticket.assigned_va_id,
      member_id: ticket.member_id,
    },
  });

  const taskLink =
    process.env.NEXT_PUBLIC_SITE_URL != null
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/member/${ticket_id}`
      : "";

  try {
    await queueEmail({
      to_email: null,
      template: "task_cancelled_v1",
      payload: {
        ticket_id: ticket_id,
        subject: ticket.subject ?? "Your task",
        member_id: ticket.member_id,
        cancellation_reason: reason,
        cancellation_notes,
        task_link: taskLink,
      },
      dedupe_key: `task_cancelled:${ticket_id}`,
    });
  } catch (e) {
    console.warn("[va/cancel-task] queueEmail task_cancelled_v1 failed", e);
  }

  try {
    const { data: adminRows } = await service.from("admins").select("user_id").limit(1);
    let adminEmail: string | null = null;
    if (adminRows && adminRows.length > 0) {
      const { data: adminData } = await service.auth.admin.getUserById(adminRows[0].user_id);
      if (adminData?.user?.email) adminEmail = adminData.user.email;
    }
    await queueEmail({
      to_email: adminEmail ?? undefined,
      template: "task_cancelled_admin_v1",
      payload: {
        ticket_id: ticket_id,
        subject: ticket.subject ?? "Task",
        cancellation_reason: reason,
        cancellation_notes,
        cancelled_by: cancelledBy,
        va_id: ticket.assigned_va_id,
      },
      dedupe_key: `task_cancelled_admin:${ticket_id}`,
    });
  } catch (e) {
    console.warn("[va/cancel-task] queueEmail task_cancelled_admin_v1 failed", e);
  }

  return NextResponse.json({ ok: true });
}
