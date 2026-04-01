import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RECURRING_OUTREACH_MACRO = {
  name: "Recurring outreach - meal planning",
  category: "Recurring tasks",
  body: `Hi {{member-name}}! This is {{va-name}}.

We are now offering recurring tasks, and I would love to set one up for you if helpful.

For example, I can create your meal plan once a week on your preferred day.

If you want this, reply with:
- Preferred day (Monday, Friday, etc.)
- Store preference (Publix, Costco, etc.)
- Budget target
- Foods you like
- Foods you want to avoid

Once I have that, I will set up your recurring task for you.`,
} as const;

async function requireVaOrAdminOrDirector(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null as null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const [
    { data: roleRow },
    { data: adminRow },
    { data: directorRow },
  ] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("directors").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const role = roleRow?.role ?? null;
  const isVa = role === "va";
  const isAdmin = role === "admin" || !!adminRow;
  const isDirector = role === "director" || !!directorRow;
  if (!isVa && !isAdmin && !isDirector) {
    return { user: null as null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, isAdmin, isDirector, error: null as null };
}

async function ensureRecurringOutreachMacro(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: existing } = await supabase
    .from("va_email_macros")
    .select("id")
    .eq("name", RECURRING_OUTREACH_MACRO.name)
    .eq("category", RECURRING_OUTREACH_MACRO.category)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return;

  await supabase.from("va_email_macros").insert({
    name: RECURRING_OUTREACH_MACRO.name,
    category: RECURRING_OUTREACH_MACRO.category,
    body: RECURRING_OUTREACH_MACRO.body,
    created_by: userId,
  });
}

/** GET: List all email macros (VA, admin, director). */
export async function GET() {
  const supabase = await createClient();
  const auth = await requireVaOrAdminOrDirector(supabase);
  if (auth.error) return auth.error;
  await ensureRecurringOutreachMacro(supabase, auth.user!.id);

  const { data: macros, error } = await supabase
    .from("va_email_macros")
    .select("id, name, body, category, created_at, created_by")
    .order("category", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ macros: macros ?? [] });
}

/** POST: Create a new email macro (VA, admin, director). VAs create their own; admin/director create presets. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await requireVaOrAdminOrDirector(supabase);
  if (auth.error) return auth.error;

  let body: { name?: string; body?: string; category?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const macroBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!name || !macroBody) {
    return NextResponse.json({ error: "name and body are required" }, { status: 400 });
  }

  const category = typeof body.category === "string" ? body.category.trim() || null : null;

  const { data: macro, error } = await supabase
    .from("va_email_macros")
    .insert({
      name,
      body: macroBody,
      category,
      created_by: auth.user!.id,
    })
    .select("id, name, body, category, created_by, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(macro);
}
