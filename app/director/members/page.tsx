import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdjustCreditForm from "../../admin/AdjustCreditForm";
import DirectorMembersSearch from "./DirectorMembersSearch";

export const dynamic = "force-dynamic";

export default async function DirectorMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/director"));

  const params = await searchParams;
  const searchQuery = (params.search ?? "").trim().toLowerCase();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, preferred_name, display_name")
    .eq("role", "member")
    .order("id");

  const { data: tickets } = await supabase
    .from("tickets")
    .select("member_id");
  const taskCountByMember: Record<string, number> = {};
  for (const t of tickets ?? []) {
    taskCountByMember[t.member_id] = (taskCountByMember[t.member_id] ?? 0) + 1;
  }

  const filtered =
    !searchQuery
      ? profiles ?? []
      : (profiles ?? []).filter((p) => {
          const name = [p.preferred_name, p.full_name, (p as { display_name?: string | null }).display_name]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return name.includes(searchQuery);
        });

  return (
    <>
      <h1 className="page-title">Members</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Adjust member credits and view task volume. Reviews left by members are visible in Reviews.
      </p>
      <section className="card" style={{ marginBottom: "var(--space-xl)" }}>
        <h2 className="section-heading">Adjust member credits</h2>
        <AdjustCreditForm />
      </section>
      <section className="card">
        <h2 className="section-heading">Members</h2>
        <DirectorMembersSearch initialSearch={params.search ?? ""} />
        <ul className="ticket-list" style={{ marginTop: "var(--space-md)" }}>
          {filtered.map((p) => (
            <li key={p.id} className="ticket-item">
              <span>{p.preferred_name ?? p.full_name ?? (p as { display_name?: string | null }).display_name ?? p.id.slice(0, 8)}</span>
              <span className="ticket-meta">
                {taskCountByMember[p.id] ?? 0} tasks
              </span>
            </li>
          ))}
        </ul>
        {filtered.length === 0 && (
          <p className="form-note">
            {profiles?.length ? "No members match your search." : "No members yet."}
          </p>
        )}
      </section>
    </>
  );
}
