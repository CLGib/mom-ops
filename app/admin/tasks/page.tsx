import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminTicketList from "../AdminTicketList";
import AdminCreateTicketForm from "../AdminCreateTicketForm";

export default async function AdminTasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin"));

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, ticket_number, subject, description, status, member_id, assigned_va_id, created_at, rating, feedback, completed_at")
    .order("created_at", { ascending: false });

  const ticketList = tickets ?? [];
  const assignedVaIds = [...new Set(ticketList.map((t) => t.assigned_va_id).filter(Boolean))] as string[];
  let vaDisplayNames: Record<string, string> = {};
  if (assignedVaIds.length > 0) {
    const { data: vaProfiles } = await supabase
      .from("va_profiles")
      .select("user_id, display_name")
      .in("user_id", assignedVaIds);
    (vaProfiles ?? []).forEach((p) => {
      vaDisplayNames[p.user_id] = p.display_name?.trim() || p.user_id.slice(0, 8) + "…";
    });
  }

  const { data: memberProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, preferred_name")
    .eq("role", "member")
    .order("id");

  let memberEmails: Record<string, string> = {};
  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const service = createServiceClient();
    const { data: { users: authUsers } } = await service.auth.admin.listUsers({ perPage: 1000 });
    const memberIds = new Set((memberProfiles ?? []).map((p) => p.id));
    authUsers?.forEach((u) => {
      if (memberIds.has(u.id)) memberEmails[u.id] = u.email ?? "";
    });
  } catch {
    // service key not available
  }

  return (
    <>
      <h1 className="page-title">Tasks</h1>
      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Create ticket</h2>
        <div className="card">
          <AdminCreateTicketForm
            members={(memberProfiles ?? [])
              .map((p) => ({
                id: p.id,
                label: memberEmails[p.id] || p.preferred_name || p.full_name || p.id.slice(0, 8),
              }))
              .sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }))}
          />
        </div>
      </section>
      <section>
        <h2 className="section-heading">All tickets</h2>
        <AdminTicketList tickets={ticketList} vaDisplayNames={vaDisplayNames} />
      </section>
    </>
  );
}
