import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import AdminTicketList from "./AdminTicketList";
import AdjustCreditForm from "./AdjustCreditForm";
import AdminClaimedTicketsList from "./AdminClaimedTicketsList";
import AdminUnassignedTicketsList from "./AdminUnassignedTicketsList";
import AdminReleasePendingTasksButton from "./AdminReleasePendingTasksButton";

const CANCELLED_STATUSES = ["cancelled_by_va", "cancelled_by_admin"] as const;
const isCancelled = (status: string) => CANCELLED_STATUSES.includes(status as (typeof CANCELLED_STATUSES)[number]);

export default async function AdminPage() {
  let supabase;
  let user: { id: string } | null = null;
  try {
    supabase = await createClient();
    const { data: { user: u } } = await supabase.auth.getUser();
    user = u;
  } catch (authErr) {
    console.error("Admin page auth error:", authErr);
    redirect("/login?next=" + encodeURIComponent("/admin"));
  }
  if (!user || !supabase) redirect("/login?next=" + encodeURIComponent("/admin"));

  type TicketRow = {
    id: string;
    ticket_number?: number | null;
    subject: string;
    description: string | null;
    status: string;
    member_id: string;
    assigned_va_id: string | null;
    created_at: string;
    rating?: number | null;
    feedback?: string | null;
    completed_at?: string | null;
  };

  try {
    let tickets: TicketRow[] = [];
    try {
      const fullSelect =
        "id, ticket_number, subject, description, status, member_id, assigned_va_id, created_at, rating, feedback, completed_at";
      const fallbackSelect =
        "id, subject, description, status, member_id, assigned_va_id, created_at, rating, feedback, completed_at";
      const { data: ticketsWithNumber, error: ticketsError } = await supabase
        .from("tickets")
        .select(fullSelect)
        .order("created_at", { ascending: false });
      if (!ticketsError && ticketsWithNumber != null) {
        tickets = Array.isArray(ticketsWithNumber) ? ticketsWithNumber : [];
      } else {
        const { data: ticketsFallback } = await supabase
          .from("tickets")
          .select(fallbackSelect)
          .order("created_at", { ascending: false });
        tickets = Array.isArray(ticketsFallback) ? ticketsFallback.map((t) => ({ ...t, ticket_number: null })) : [];
      }
    } catch {
      tickets = [];
    }

    const ticketList = (Array.isArray(tickets) ? tickets : []).map((t) => ({
      ...t,
      id: typeof t?.id === "string" ? t.id : "",
      created_at: t?.created_at != null ? String(t.created_at) : "",
      subject: typeof t?.subject === "string" ? t.subject : "",
      status: typeof t?.status === "string" ? t.status : "new",
      member_id: typeof t?.member_id === "string" ? t.member_id : "",
      assigned_va_id: t?.assigned_va_id ?? null,
      description: t?.description ?? null,
      ticket_number: t?.ticket_number ?? null,
      rating: t?.rating ?? null,
      feedback: t?.feedback ?? null,
      completed_at: t?.completed_at ?? null,
    })).filter((t) => t.id);
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

    const memberIds = [...new Set(ticketList.map((t) => t.member_id).filter(Boolean))];
    let memberDisplayNames: Record<string, string> = {};
    let memberEmails: Record<string, string> = {};
    if (memberIds.length > 0) {
      const { data: memberProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, preferred_name")
        .in("id", memberIds);
      (memberProfiles ?? []).forEach((p) => {
        const name = [p.preferred_name, p.full_name].filter(Boolean).join(" ").trim() || p.id.slice(0, 8) + "…";
        memberDisplayNames[p.id] = name;
      });
      try {
        const service = createServiceClient();
        const { data: { users: authUsers } } = await service.auth.admin.listUsers({ perPage: 1000 });
        const memberIdSet = new Set(memberIds);
        authUsers?.forEach((u) => {
          if (memberIdSet.has(u.id) && u.email) memberEmails[u.id] = u.email;
        });
      } catch {
        // ignore; emails just won't show
      }
    }

    const unassignedTickets = ticketList.filter(
      (t) => t.status === "new" && t.assigned_va_id == null
    );

    const pendingAssignedCount = ticketList.filter(
      (t) => t.assigned_va_id != null && !isCancelled(t.status) && t.status !== "completed" && t.status !== "closed"
    ).length;

    const myClaimedTickets = ticketList.filter(
      (t) => t.assigned_va_id === user.id && !isCancelled(t.status)
    );

    const lowRatingCount = ticketList.filter((t) => t.rating != null && t.rating < 4).length;

    // Tickets that have VA messages pending CEO review (training mode)
    let ticketIdsNeedingReview: Set<string> = new Set();
    try {
      const { data: pendingMessages } = await supabase
        .from("ticket_messages")
        .select("ticket_id")
        .eq("visible_to_member", false)
        .eq("internal", false)
        .eq("sender_role", "va");
      if (pendingMessages?.length) {
        pendingMessages.forEach((row) => {
          if (row?.ticket_id) ticketIdsNeedingReview.add(row.ticket_id);
        });
      }
    } catch {
      // ignore; badge just won't show
    }

    return (
      <>
        <h1 className="page-title">CEO Dashboard</h1>
      {ticketIdsNeedingReview.size > 0 && (
        <section className="card card--highlight" style={{ marginBottom: "var(--space-2xl)", borderColor: "var(--color-accent, #b8860b)" }}>
          <h2 className="section-heading">Training VA messages need review</h2>
          <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
            {ticketIdsNeedingReview.size} ticket{ticketIdsNeedingReview.size !== 1 ? "s" : ""} have specialist messages waiting for your approval before the member sees them.
          </p>
          <Link href="/admin?needsReview=1#admin-all-tickets" className="btn btn-primary">
            Review tickets
          </Link>
        </section>
      )}
      {lowRatingCount > 0 && (
        <section className="card card--highlight" style={{ marginBottom: "var(--space-2xl)", borderColor: "var(--color-accent, #b8860b)" }}>
          <h2 className="section-heading">Low ratings (below 4 stars)</h2>
          <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
            {lowRatingCount} task{lowRatingCount !== 1 ? "s" : ""} rated below 4 stars. Review and follow up as needed.
          </p>
          <Link href="/admin/reviews" className="btn btn-primary">
            View reviews
          </Link>
        </section>
      )}
      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">VA applications</h2>
        <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
          Review submissions from the VA apply quiz (attention score and creative responses).
        </p>
        <Link href="/admin/va-applications" className="btn btn-secondary">
          View VA applications
        </Link>
      </section>
      {myClaimedTickets.length > 0 && (
        <section className="card card--highlight" style={{ marginBottom: "var(--space-2xl)" }}>
          <h2 className="section-heading">My claimed tickets</h2>
          <AdminClaimedTicketsList
          items={myClaimedTickets}
          memberDisplayNames={memberDisplayNames}
          memberEmails={memberEmails}
        />
        </section>
      )}
      <AdminReleasePendingTasksButton pendingCount={pendingAssignedCount} />
      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Adjust credit balance</h2>
        <div className="card">
          <AdjustCreditForm />
        </div>
      </section>
      {unassignedTickets.length > 0 && (
        <section style={{ marginBottom: "var(--space-2xl)" }}>
          <h2 className="section-heading">Unassigned tickets (claim as CEO)</h2>
          <AdminUnassignedTicketsList
          items={unassignedTickets}
          memberDisplayNames={memberDisplayNames}
          memberEmails={memberEmails}
        />
        </section>
      )}
      <section id="admin-all-tickets">
        <h2 className="section-heading">All tickets</h2>
        <AdminTicketList
          tickets={ticketList}
          vaDisplayNames={vaDisplayNames}
          memberDisplayNames={memberDisplayNames}
          memberEmails={memberEmails}
          ticketIdsNeedingReview={Array.from(ticketIdsNeedingReview)}
        />
      </section>
    </>
    );
  } catch (err) {
    console.error("Admin dashboard page error:", err);
    return (
      <div style={{ padding: "var(--space-xl)", textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
        <h1 className="page-title">Couldn&apos;t load dashboard</h1>
        <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
          Something went wrong loading this page. Try refreshing or log out and sign back in.
        </p>
        <div style={{ display: "flex", gap: "var(--space-md)", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/admin" className="btn btn-primary">
            Try again
          </a>
          <a href="/api/auth/signout?next=/admin" className="btn btn-secondary">
            Log out
          </a>
        </div>
      </div>
    );
  }
}
