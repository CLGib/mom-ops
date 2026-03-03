import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FeedbackRequestForm from "../../components/FeedbackRequestForm";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin/feedback"));

  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
  const role = roleRow?.role;
  if (role !== "admin" && role !== "director") redirect("/no-access");

  return (
    <main className="app-shell">
      <h1 className="page-title">Request a Feature & Report Bug</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Submit a feature request or bug report. It will appear on the <a href="/admin/feature-bug" className="link">Feature &amp; Bug Log</a> board.
      </p>
      <FeedbackRequestForm />
    </main>
  );
}
