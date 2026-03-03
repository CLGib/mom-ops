import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import AssignRoleForm from "../AssignRoleForm";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin"));

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (myProfile?.role !== "admin") {
    redirect("/no-access");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role")
    .order("id");

  let emails: Record<string, string> = {};
  try {
    const service = createServiceClient();
    const { data: { users: authUsers } } = await service.auth.admin.listUsers({ perPage: 1000 });
    authUsers?.forEach((u) => {
      emails[u.id] = u.email ?? "";
    });
  } catch {
    // service key not available
  }

  const teamRoles = ["admin", "director", "cfo", "va"];
  const withEmail = (profiles ?? [])
    .filter((p) => teamRoles.includes((p.role ?? "").toString().toLowerCase()))
    .map((p) => ({
      id: p.id,
      role: (p.role ?? "member").toString().toLowerCase(),
      email: emails[p.id] ?? "(no email)",
    }));

  return (
    <>
      <h1 className="page-title">Team &amp; roles</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Assign roles to users. Only the CEO can access this page. Setting a user to CXO gives them access to the CXO portal.
      </p>
      <section className="card">
        <h2 className="section-heading">Users</h2>
        <AssignRoleForm users={withEmail} />
      </section>
    </>
  );
}
