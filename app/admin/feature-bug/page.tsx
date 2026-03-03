import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FeatureBugBoard from "./FeatureBugBoard";

export const dynamic = "force-dynamic";

const STATUSES = ["backlog", "in_progress", "qa", "done", "wont_fix"] as const;

export default async function AdminFeatureBugPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin"));

  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
  const role = roleRow?.role;
  if (role !== "admin" && role !== "director") redirect("/no-access");

  const { data: cards } = await supabase
    .from("feature_bug_cards")
    .select("id, type, title, description, status, requestor_id, requestor_role, requestor_email, owner_id, attachment_url, created_at, updated_at")
    .order("created_at", { ascending: false });

  const adminDirectorIds = new Set<string>();
  const { data: admins } = await supabase.from("admins").select("user_id");
  const { data: directors } = await supabase.from("directors").select("user_id");
  (admins ?? []).forEach((r) => adminDirectorIds.add(r.user_id));
  (directors ?? []).forEach((r) => adminDirectorIds.add(r.user_id));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, preferred_name")
    .in("id", Array.from(adminDirectorIds));

  const ownerOptions = (profiles ?? []).map((p) => ({
    id: p.id,
    label: (p.preferred_name ?? p.full_name ?? p.id).trim() || p.id.slice(0, 8),
  }));

  return (
    <main className="app-shell">
      <h1 className="page-title">Feature & Bug Log</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        <Link href="/admin/feedback" className="link">Submit a feature or bug</Link>
        {" · "}
        Move cards between columns, assign an owner (CEO/CXO), add notes. When a card is moved to Done, the requestor is emailed.
      </p>
      <FeatureBugBoard
        initialCards={cards ?? []}
        ownerOptions={ownerOptions}
        statuses={[...STATUSES]}
      />
    </main>
  );
}
