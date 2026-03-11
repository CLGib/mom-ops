import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MemberTaskList from "../MemberTaskList";

export const dynamic = "force-dynamic";

function PendingTasksFallback() {
  return (
    <main className="app-shell">
      <h1 className="page-title">Tasks</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        We couldn&apos;t load your tasks. Try again or go back to Home.
      </p>
      <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap" }}>
        <a href="/member/pending" className="btn btn-primary">Try again</a>
        <Link href="/member" className="btn btn-secondary">Go home</Link>
      </div>
    </main>
  );
}

export default async function MemberPendingPage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=" + encodeURIComponent("/member/pending"));

    // Fetch all tickets (inbox + closed) so MemberTaskList can show inbox by default and closed/canceled via search
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id, subject, description, status, created_at")
      .eq("member_id", user.id)
      .order("created_at", { ascending: false });

    const list = (tickets ?? []).filter((t) => t?.id != null);

    return (
      <main className="app-shell">
        <h1 className="page-title">Tasks</h1>
        <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
          Your inbox and completed tasks. Search to find closed or canceled tasks.
        </p>
        {list.length === 0 ? (
          <p className="form-note">No tasks yet. <Link href="/member#submit" className="link">Submit a task</Link> from Home.</p>
        ) : (
          <MemberTaskList tickets={list} />
        )}
      </main>
    );
  } catch (err) {
    const e = err as Error & { digest?: string };
    if (e?.digest?.startsWith?.("NEXT_REDIRECT") || e?.digest?.startsWith?.("NEXT_NOT_FOUND")) throw err;
    return <PendingTasksFallback />;
  }
}
