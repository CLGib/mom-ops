import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { ticket_id: string; new_va_id: string; note?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ticket_id, new_va_id, note } = body;
  if (!ticket_id || typeof ticket_id !== "string") {
    return NextResponse.json({ error: "ticket_id is required" }, { status: 400 });
  }
  if (!new_va_id || typeof new_va_id !== "string") {
    return NextResponse.json({ error: "new_va_id is required" }, { status: 400 });
  }
  if (new_va_id === user.id) {
    return NextResponse.json(
      { error: "Cannot reassign the task to yourself" },
      { status: 400 }
    );
  }

  const service = createServiceClient();

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
    .maybeSingle();
  const isAdmin = roleRow?.role === "admin";
  const isAssignedVA = ticket.assigned_va_id === user.id;
  if (!isAssignedVA && !isAdmin) {
    return NextResponse.json(
      { error: "Only the assigned VA or CEO can reassign this task" },
      { status: 403 }
    );
  }

  const allowedStatuses = ["assigned", "in_progress"];
  if (!allowedStatuses.includes(ticket.status)) {
    return NextResponse.json(
      { error: "Task can only be reassigned when status is Assigned or In Progress" },
      { status: 400 }
    );
  }

  const { data: newVaProfile } = await service
    .from("va_profiles")
    .select("user_id, display_name, onboarding_complete, training_complete")
    .eq("user_id", new_va_id)
    .single();

  if (!newVaProfile || newVaProfile.onboarding_complete !== true || newVaProfile.training_complete !== true) {
    return NextResponse.json(
      { error: "Selected specialist is not available to receive tasks" },
      { status: 400 }
    );
  }

  const { data: newVaRole } = await service
    .from("profiles")
    .select("role")
    .eq("id", new_va_id)
    .single();

  if (newVaRole?.role !== "va") {
    return NextResponse.json(
      { error: "Selected user is not a specialist" },
      { status: 400 }
    );
  }

  const newVaDisplayName = newVaProfile.display_name?.trim() || "A specialist";

  const { error: updateError } = await service
    .from("tickets")
    .update({ assigned_va_id: new_va_id })
    .eq("id", ticket_id);

  if (updateError) {
    console.error("[va/reassign-task] ticket update failed", updateError);
    return NextResponse.json(
      { error: "Failed to reassign task" },
      { status: 500 }
    );
  }

  const messageText =
    typeof note === "string" && note.trim()
      ? `Reassigned this task to ${newVaDisplayName}. Note: ${note.trim()}`
      : `Reassigned this task to ${newVaDisplayName}.`;

  const senderRole = isAdmin ? "admin" : "va";
  await service.from("ticket_messages").insert({
    ticket_id,
    sender_id: user.id,
    sender_role: senderRole,
    message: messageText,
  });

  try {
    await service.from("audit_log").insert({
      user_id: user.id,
      action_type: "va_task_reassigned",
      affected_entity_type: "ticket",
      affected_entity_id: ticket_id,
      details: {
        previous_va_id: ticket.assigned_va_id,
        new_va_id,
        new_va_display_name: newVaDisplayName,
        member_id: ticket.member_id,
      },
    });
  } catch (e) {
    console.warn("[va/reassign-task] audit_log insert failed", e);
  }

  return NextResponse.json({ ok: true });
}
