import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import VAEmailMacrosClient from "./VAEmailMacrosClient";

export const dynamic = "force-dynamic";

export default async function VAEmailMacrosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va/email-macros"));

  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const role = roleRow?.role ?? null;
  if (role !== "va") redirect("/no-access");

  const { data: macros, error } = await supabase
    .from("va_email_macros")
    .select("id, name, body, category, created_at, created_by")
    .order("category", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  const list = (macros ?? []).map((m) => ({
    id: m.id,
    name: m.name ?? "",
    body: m.body ?? "",
    category: m.category ?? null,
    created_at: m.created_at,
    created_by: m.created_by ?? null,
  }));

  return (
    <main className="app-shell">
      <h1 className="page-title">Email Macro Library</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Preset macros from your team are read-only examples for tone and structure. You can <strong>create your own macros</strong> and edit or delete only those. Insert any macro into your reply from the &quot;Insert macro&quot; button on a task page.
      </p>
      <VAEmailMacrosClient
        initialMacros={list}
        currentUserId={user.id}
        loadError={error?.message ?? null}
      />
      <p style={{ marginTop: "var(--space-xl)" }}>
        <Link href="/va/onboarding" className="link">Back to Onboarding</Link>
      </p>
    </main>
  );
}
