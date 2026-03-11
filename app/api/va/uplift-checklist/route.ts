import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type ChecklistState = {
  u?: boolean;
  p?: boolean;
  l?: boolean;
  i?: boolean;
  f?: boolean;
  t?: boolean;
};

export async function PATCH(request: NextRequest) {
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

  let body: { ticketId?: string } & ChecklistState;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ticketId = typeof body.ticketId === "string" ? body.ticketId.trim() : "";
  if (!ticketId) {
    return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: ticket, error: ticketError } = await service
    .from("tickets")
    .select("id, assigned_va_id")
    .eq("id", ticketId)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (ticket.assigned_va_id !== user.id) {
    return NextResponse.json(
      { error: "Only the assigned VA can update this checklist" },
      { status: 403 }
    );
  }

  const updates: Partial<ChecklistState> = {};
  if (typeof body.u === "boolean") updates.u = body.u;
  if (typeof body.p === "boolean") updates.p = body.p;
  if (typeof body.l === "boolean") updates.l = body.l;
  if (typeof body.i === "boolean") updates.i = body.i;
  if (typeof body.f === "boolean") updates.f = body.f;
  if (typeof body.t === "boolean") updates.t = body.t;

  if (Object.keys(updates).length === 0) {
    const { data: existing } = await service
      .from("ticket_va_uplift_checklist")
      .select("u, p, l, i, f, t, completed_at")
      .eq("ticket_id", ticketId)
      .maybeSingle();

    const state = existing ?? {
      u: false,
      p: false,
      l: false,
      i: false,
      f: false,
      t: false,
      completed_at: null,
    };
    return NextResponse.json({
      u: state.u,
      p: state.p,
      l: state.l,
      i: state.i,
      f: state.f,
      t: state.t,
      completedAt: (state as { completed_at?: string | null }).completed_at ?? null,
    });
  }

  const { data: existing } = await service
    .from("ticket_va_uplift_checklist")
    .select("u, p, l, i, f, t")
    .eq("ticket_id", ticketId)
    .maybeSingle();

  const merged = {
    u: updates.u ?? existing?.u ?? false,
    p: updates.p ?? existing?.p ?? false,
    l: updates.l ?? existing?.l ?? false,
    i: updates.i ?? existing?.i ?? false,
    f: updates.f ?? existing?.f ?? false,
    t: updates.t ?? existing?.t ?? false,
  };

  const allChecked = merged.u && merged.p && merged.l && merged.i && merged.f && merged.t;
  const completedAt = allChecked ? new Date().toISOString() : null;

  const { data: row, error: upsertError } = await service
    .from("ticket_va_uplift_checklist")
    .upsert(
      {
        ticket_id: ticketId,
        u: merged.u,
        p: merged.p,
        l: merged.l,
        i: merged.i,
        f: merged.f,
        t: merged.t,
        completed_at: completedAt,
      },
      { onConflict: "ticket_id" }
    )
    .select("u, p, l, i, f, t, completed_at")
    .single();

  if (upsertError) {
    console.error("[va/uplift-checklist] upsert failed", upsertError);
    return NextResponse.json(
      { error: "Failed to save checklist" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    u: row.u,
    p: row.p,
    l: row.l,
    i: row.i,
    f: row.f,
    t: row.t,
    completedAt: row.completed_at ?? null,
  });
}
