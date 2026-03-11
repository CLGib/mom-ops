import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ToolboxTemplatesClient from "./ToolboxTemplatesClient";

export const dynamic = "force-dynamic";

type TemplateRow = {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  created_by: string;
  author: string;
  created_at: string;
  updated_at: string;
};

export default async function ToolboxTemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/toolbox/templates"));

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
  const isAdmin = role === "admin" || !!adminRow;
  const isDirector = role === "director" || !!directorRow;
  const isVa = role === "va";
  if (!isVa && !isAdmin && !isDirector) redirect("/no-access");

  const { data: templatesData, error } = await supabase
    .from("va_toolbox_templates")
    .select("id, title, description, file_path, file_name, created_by, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const userIds = [...new Set((templatesData ?? []).map((t) => t.created_by))];
  const authorMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, preferred_name, full_name")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      authorMap[p.id] = p.preferred_name?.trim() || p.full_name?.trim() || "Unknown";
    }
  }

  const initialTemplates: TemplateRow[] = (templatesData ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    file_path: t.file_path,
    file_name: t.file_name,
    created_by: t.created_by,
    author: authorMap[t.created_by] ?? "Unknown",
    created_at: t.created_at,
    updated_at: t.updated_at,
  }));

  return (
    <main className="app-shell">
      <h1 className="page-title">Template Generator</h1>
      <ToolboxTemplatesClient initialTemplates={initialTemplates} currentUserId={user.id} />
    </main>
  );
}
