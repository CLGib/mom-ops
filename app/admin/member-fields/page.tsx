import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MemberFieldsClient from "./MemberFieldsClient";

export const dynamic = "force-dynamic";

export type CustomFieldDefinition = {
  id: string;
  key: string;
  label: string;
  field_type: "text" | "number" | "date" | "multiline";
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export default async function AdminMemberFieldsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin/member-fields"));

  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (roleRow?.role !== "admin") redirect("/no-access");

  const { data: rows, error } = await supabase
    .from("member_profile_custom_field_definitions")
    .select("id, key, label, field_type, sort_order, active, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("key", { ascending: true });

  const fields: CustomFieldDefinition[] = (rows ?? []).map((r) => ({
    id: r.id,
    key: r.key ?? "",
    label: r.label ?? "",
    field_type: (r.field_type as CustomFieldDefinition["field_type"]) ?? "text",
    sort_order: typeof r.sort_order === "number" ? r.sort_order : 0,
    active: r.active ?? true,
    created_at: r.created_at ?? "",
    updated_at: r.updated_at ?? "",
  }));

  return (
    <main className="app-shell">
      <h1 className="page-title">Member profile custom fields</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Add extra fields that appear on member profiles and in VA context. Members and VAs can fill these in. Use for things like &quot;Allergy notes&quot; or &quot;Preferred contact time&quot;.
      </p>
      <MemberFieldsClient initialFields={fields} loadError={error?.message ?? null} />
    </main>
  );
}
