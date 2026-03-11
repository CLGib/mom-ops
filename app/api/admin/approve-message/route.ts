import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { queueEmail } from "@/lib/email/queue";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roleRes = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
  const role = roleRes.data?.role;
  if (role !== "admin" && role !== "director") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { message_id?: string; ticket_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { message_id, ticket_id } = body;
  if (!message_id || typeof message_id !== "string") {
    return NextResponse.json({ error: "message_id is required" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: message, error: msgErr } = await service
    .from("ticket_messages")
    .select("id, ticket_id, message, sender_role")
    .eq("id", message_id)
    .single();
  if (msgErr || !message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
  if (ticket_id && message.ticket_id !== ticket_id) {
    return NextResponse.json({ error: "Ticket id does not match message" }, { status: 400 });
  }

  const { error: updateErr } = await service
    .from("ticket_messages")
    .update({ visible_to_member: true })
    .eq("id", message_id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  const { data: ticket } = await service
    .from("tickets")
    .select("id, subject, member_id")
    .eq("id", message.ticket_id)
    .single();
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  await queueEmail({
    to_email: null,
    template: "new_message_v1",
    payload: {
      message_id,
      ticket_id: ticket.id,
      subject: ticket.subject ?? "",
      member_id: ticket.member_id,
      message_body: (message.message as string) ?? "",
    },
    dedupe_key: `new_message:${message_id}`,
  });

  return NextResponse.json({ ok: true });
}
