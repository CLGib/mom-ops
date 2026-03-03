import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (role?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!id?.trim()) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let body: { category?: string; task?: string; credits?: number; template?: string; rank?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: { category?: string; task?: string; credits?: number; template?: string; rank?: number } = {};
  if (typeof body.category === "string" && body.category.trim()) {
    updates.category = body.category.trim();
  }
  if (typeof body.task === "string" && body.task.trim()) {
    updates.task = body.task.trim();
  }
  if (typeof body.credits === "number" && body.credits >= 0) {
    updates.credits = body.credits;
  }
  if (typeof body.template === "string") {
    updates.template = body.template;
  }
  if (typeof body.rank === "number" && body.rank >= 0) {
    updates.rank = body.rank;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "At least one field to update is required" }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("task_library")
    .update(updates)
    .eq("id", id.trim())
    .select("id, category, task, credits, template, rank")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (role?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!id?.trim()) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabase.from("task_library").delete().eq("id", id.trim());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
