import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { queueEmail } from "@/lib/email/queue";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL or service role key not set");
  return createClient(url, key);
}

const ALLOWED_TEMPLATES = [
  "welcome_v1",
  "task_submitted_v1",
  "new_message_v1",
] as const;

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    template: string;
    payload: Record<string, unknown>;
    dedupe_key: string;
    send_after?: string;
    to_email?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { template, payload = {}, dedupe_key, send_after, to_email } = body;
  if (!template || !dedupe_key || typeof template !== "string" || typeof dedupe_key !== "string") {
    return NextResponse.json(
      { error: "template and dedupe_key are required" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TEMPLATES.includes(template as (typeof ALLOWED_TEMPLATES)[number])) {
    return NextResponse.json({ error: "Invalid template" }, { status: 400 });
  }

  const service = getServiceSupabase();

  if (template === "welcome_v1") {
    const userId = payload.user_id ?? user.id;
    if (userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await queueEmail({
      to_email: user.email,
      template: "welcome_v1",
      payload: { user_id: user.id },
      dedupe_key: `welcome:${user.id}`,
      send_after: send_after ? new Date(send_after) : undefined,
    });
    return NextResponse.json({ ok: true });
  }

  if (template === "task_submitted_v1") {
    const ticketId = payload.ticket_id;
    if (typeof ticketId !== "string") {
      return NextResponse.json({ error: "ticket_id required" }, { status: 400 });
    }
    const { data: ticket } = await service
      .from("tickets")
      .select("member_id")
      .eq("id", ticketId)
      .single();
    if (!ticket || ticket.member_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await queueEmail({
      to_email: user.email,
      template: "task_submitted_v1",
      payload: { ticket_id: ticketId, subject: payload.subject ?? "" },
      dedupe_key: `task_submitted:${ticketId}`,
      send_after: send_after ? new Date(send_after) : undefined,
    });
    return NextResponse.json({ ok: true });
  }

  if (template === "new_message_v1") {
    const messageId = payload.message_id;
    const ticketId = payload.ticket_id;
    if (typeof messageId !== "string" || typeof ticketId !== "string") {
      return NextResponse.json(
        { error: "message_id and ticket_id required" },
        { status: 400 }
      );
    }
    const { data: ticket } = await service
      .from("tickets")
      .select("member_id, assigned_va_id")
      .eq("id", ticketId)
      .single();
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();
    const role = (profile as { role?: string } | null)?.role;
    const isVa = role === "va";
    const isMember = ticket.member_id === user.id;
    if (!isVa && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isVa && ticket.assigned_va_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isVa) {
      await queueEmail({
        to_email: null,
        template: "new_message_v1",
        payload: {
          message_id: messageId,
          ticket_id: ticketId,
          subject: payload.subject ?? "",
          member_id: ticket.member_id,
        },
        dedupe_key: `new_message:${messageId}`,
        send_after: send_after ? new Date(send_after) : undefined,
      });
    } else {
      return NextResponse.json(
        { error: "Only VA can queue new_message_v1 to member" },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid template" }, { status: 400 });
}
