import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmailMacrosClient from "./EmailMacrosClient";

export const dynamic = "force-dynamic";

type MacroRow = {
  id: string;
  name: string;
  body: string;
  category: string | null;
  created_at: string;
};

export default async function AdminEmailMacrosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin/email-macros"));

  const [
    { data: adminRow },
    { data: directorRow },
  ] = await Promise.all([
    supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("directors").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!adminRow && !directorRow) redirect("/no-access");

  const { data: macros, error } = await supabase
    .from("va_email_macros")
    .select("id, name, body, category, created_at")
    .order("category", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  const rows: MacroRow[] = (macros ?? []).map((m) => ({
    id: m.id,
    name: m.name ?? "",
    body: m.body ?? "",
    category: m.category ?? null,
    created_at: m.created_at,
  }));

  return (
    <main className="app-shell">
      <h1 className="page-title">Email Macros</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Manage reply macros that VAs can insert in ticket replies. VAs see these in the &quot;Insert macro&quot; dropdown on task pages and in the Email macro library.
      </p>
      <EmailMacrosClient initialMacros={rows} loadError={error?.message ?? null} />
    </main>
  );
}
