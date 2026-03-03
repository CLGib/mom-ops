import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
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

  let body: { category?: string; task?: string; credits?: number; template?: string; rank?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const category = typeof body.category === "string" ? body.category.trim() : "";
  const task = typeof body.task === "string" ? body.task.trim() : "";
  const credits = typeof body.credits === "number" ? body.credits : typeof body.credits === "string" ? parseInt(body.credits, 10) : 0;
  const template = typeof body.template === "string" ? body.template.trim() : "";
  const rank = typeof body.rank === "number" ? body.rank : typeof body.rank === "string" ? parseInt(body.rank, 10) : 500;

  if (!category || !task) {
    return NextResponse.json({ error: "category and task are required" }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from("task_library")
    .insert({
      category,
      task,
      credits: Number.isNaN(credits) ? 0 : credits,
      template,
      rank: Number.isNaN(rank) ? 500 : rank,
    })
    .select("id, category, task, credits, template, rank")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(inserted);
}
