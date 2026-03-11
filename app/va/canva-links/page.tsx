import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CanvaLinksClient from "./CanvaLinksClient";

export const dynamic = "force-dynamic";

export default async function VACanvaLinksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va/canva-links"));

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
  if (!isVa && !isAdmin && !isDirector) redirect("/no-access");

  const { data: links, error } = await supabase
    .from("va_canva_links")
    .select("id, url, title, description, created_by, created_at, updated_at")
    .order("created_at", { ascending: false });

  const list = (links ?? []).map((l) => ({
    id: l.id,
    url: l.url ?? "",
    title: l.title ?? null,
    description: l.description ?? null,
    created_by: l.created_by,
    created_at: l.created_at,
    updated_at: l.updated_at,
  }));

  return (
    <main className="app-shell">
      <h1 className="page-title">Canva links</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Add and browse Canva design links for reuse. Anyone on the team can add links; you can edit or remove only the ones you added.
      </p>
      <CanvaLinksClient
        initialLinks={list}
        currentUserId={user.id}
        loadError={error?.message ?? null}
      />
    </main>
  );
}
