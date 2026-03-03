import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FeedbackRequestForm from "../../components/FeedbackRequestForm";

export const dynamic = "force-dynamic";

export default async function MemberFeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/member/feedback"));

  return (
    <main className="app-shell">
      <h1 className="page-title">Request a Feature & Report Bug</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Submit a feature request or bug report. It will be added to our backlog and we&apos;ll email you when it&apos;s resolved.
      </p>
      <FeedbackRequestForm />
    </main>
  );
}
