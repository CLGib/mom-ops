import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import VATrainingContent from "./VATrainingContent";
import VATrainingQuiz from "./VATrainingQuiz";

export const dynamic = "force-dynamic";

export default async function VATrainingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va/training"));

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  const isAdmin = roleRow?.role === "admin";

  const { data: vaProfile } = await supabase
    .from("va_profiles")
    .select("training_complete")
    .eq("user_id", user.id)
    .single();

  const { data: sections } = await supabase
    .from("va_training_sections")
    .select("id, title, content, sort_order, video_url, video_url_2, image_urls, pdf_urls")
    .order("sort_order", { ascending: true });

  const alreadyComplete = vaProfile?.training_complete === true;

  return (
    <main className="app-shell">
      <h1 className="page-title">Training</h1>
      {isAdmin ? (
        <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
          You are viewing the VA training as CEO. VAs must complete this and pass the quiz (90%+) before they can view or claim tasks.
        </p>
      ) : (
        <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
          Complete each section below. When you&apos;re done, take the quiz. You need 90% or higher to pass and unlock task access.
        </p>
      )}
      <div style={{ overflowY: "auto", maxHeight: "none" }}>
        <VATrainingContent sections={sections ?? []} />
      </div>
      {alreadyComplete ? (
        <div className="card" style={{ maxWidth: "720px", marginTop: "var(--space-xl)" }}>
          <p style={{ margin: 0, color: "var(--color-success, green)", fontWeight: 500 }}>
            You have completed training. You can claim tasks from the Tasks page.
          </p>
          <p style={{ margin: "var(--space-sm) 0 0" }}>
            <Link href="/va/tasks" className="btn btn-primary">
              Go to Tasks
            </Link>
          </p>
        </div>
      ) : (
        <VATrainingQuiz />
      )}
    </main>
  );
}
