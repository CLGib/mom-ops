import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import VATicketSearchList from "../VATicketSearchList";

export const dynamic = "force-dynamic";

export default async function VATicketsSearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va/tickets"));

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, ticket_number, subject, description, status, assigned_va_id, created_at, updated_at, completed_at")
    .order("updated_at", { ascending: false })
    .limit(1000);

  const vaIds = [
    ...new Set(
      (tickets ?? [])
        .map((t) => t.assigned_va_id)
        .filter((id): id is string => id != null)
    ),
  ];
  const vaDisplayNames: Record<string, string> = {};
  if (vaIds.length > 0) {
    const { data: profiles } = await supabase
      .from("va_profiles")
      .select("user_id, display_name")
      .in("user_id", vaIds);
    for (const p of profiles ?? []) {
      vaDisplayNames[p.user_id] = p.display_name?.trim() || "Specialist";
    }
  }

  return (
    <main className="app-shell">
      <Link href="/va" className="back-link">
        ← Back to dashboard
      </Link>
      <h1 className="page-title">Search all tickets</h1>
      <section>
        <h2 className="section-heading">Browse tickets</h2>
        <VATicketSearchList tickets={tickets ?? []} vaDisplayNames={vaDisplayNames} />
      </section>
    </main>
  );
}
