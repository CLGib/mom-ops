import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CreateTicketForm from "../CreateTicketForm";

export const dynamic = "force-dynamic";

// Custom request — the demoted home for members who need something not in
// the helper library. Reuses the existing CreateTicketForm.
export default async function MemberCustomRequestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=" + encodeURIComponent("/member/custom"));
  }

  // Past VAs the member has worked with — populates the "request a
  // specialist" dropdown in the form.
  const { data: pastTicketsWithSubject } = await supabase
    .from("tickets")
    .select("assigned_va_id, subject")
    .eq("member_id", user.id)
    .not("assigned_va_id", "is", null)
    .in("status", ["completed", "closed"])
    .order("completed_at", { ascending: false });

  const subjectByVaId = new Map<string, string>();
  for (const t of pastTicketsWithSubject ?? []) {
    if (t.assigned_va_id && !subjectByVaId.has(t.assigned_va_id)) {
      subjectByVaId.set(
        t.assigned_va_id,
        (t.subject && String(t.subject).trim()) || "previous task",
      );
    }
  }
  const pastVaIds = [...new Set((pastTicketsWithSubject ?? [])
    .map((t) => t.assigned_va_id!)
    .filter(Boolean))];
  const pastVas: { id: string; label: string; imageUrl?: string | null }[] =
    pastVaIds.map((vaId) => ({
      id: vaId,
      label: `Same specialist as "${subjectByVaId.get(vaId) ?? "previous task"}"`,
      imageUrl: null,
    }));

  return (
    <main className="app-shell">
      <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
        <Link href="/member" className="link">
          ← Back to home
        </Link>
      </p>
      <h1 className="page-title">Custom request</h1>
      <p
        className="form-note"
        style={{
          marginBottom: "var(--space-lg)",
          maxWidth: 640,
          fontSize: "1rem",
          lineHeight: 1.5,
        }}
      >
        Not finding the right helper in the{" "}
        <Link href="/member/helpers" className="link">
          library
        </Link>
        ? Tell us what you need and we&apos;ll handle it.
      </p>
      <div className="card member-submit-card" style={{ maxWidth: 720 }}>
        <CreateTicketForm
          memberId={user.id}
          aiEnabled={!!process.env.ANTHROPIC_API_KEY}
          pastVas={pastVas}
        />
      </div>
      <p
        className="form-note"
        style={{ marginTop: "var(--space-md)", maxWidth: 720 }}
      >
        You can also email your request to{" "}
        <a
          href={`mailto:${process.env.NEXT_PUBLIC_INBOUND_TASK_EMAIL || "task@in.themomops.com"}`}
          className="link"
        >
          {process.env.NEXT_PUBLIC_INBOUND_TASK_EMAIL ||
            "task@in.themomops.com"}
        </a>
        .
      </p>
    </main>
  );
}
