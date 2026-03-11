import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MemberDiscoveryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/member"));

  const [quizzesRes, resultsRes, responsesRes] = await Promise.all([
    supabase.from("quizzes").select("id, slug, title, description").order("created_at", { ascending: true }),
    supabase.from("quiz_results").select("quiz_id, outcome_title, completed_at").eq("member_id", user.id),
    supabase.from("quiz_responses").select("quiz_id, status").eq("member_id", user.id),
  ]);

  const quizzes = quizzesRes.data ?? [];
  const resultsByQuiz = new Map((resultsRes.data ?? []).map((r) => [r.quiz_id, r]));
  const responseByQuiz = new Map((responsesRes.data ?? []).map((r) => [r.quiz_id, r]));

  return (
    <main className="app-shell">
      <h1 className="page-title">Just for Fun</h1>
      <p className="section-lead" style={{ marginBottom: "var(--space-xl)", maxWidth: "36rem" }}>
        Think of this as your vibe check - the more you share, the better we get at knowing what you need. No wrong answers, promise.
      </p>
      {quizzes.length === 0 ? (
        <p className="form-note">No quizzes available yet. Check back soon.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          {quizzes.map((quiz) => {
            const result = resultsByQuiz.get(quiz.id);
            const response = responseByQuiz.get(quiz.id);
            const inProgress = response?.status === "in_progress";
            const completed = !!result;
            return (
              <div key={quiz.id} className="card" style={{ padding: "var(--space-lg)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-md)", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 min(16rem, 100%)", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "var(--space-sm)", marginBottom: "var(--space-xs)" }}>
                      <h2 className="section-heading" style={{ margin: 0, fontSize: "1.1rem" }}>{quiz.title}</h2>
                      {completed && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            background: "var(--color-success-bg, #e8f5e9)",
                            color: "var(--color-success, #2e7d32)",
                            flexShrink: 0,
                          }}
                        >
                          Done
                        </span>
                      )}
                    </div>
                    {quiz.description && (
                      <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>{quiz.description}</p>
                    )}
                  </div>
                  <div
                    className="discovery-quiz-actions"
                    style={{
                      display: "flex",
                      gap: "var(--space-sm)",
                      flexWrap: "wrap",
                      flexShrink: 0,
                      minWidth: 0,
                      maxWidth: "100%",
                    }}
                  >
                    {completed && (
                      <Link href={`/member/quizzes/${quiz.slug}/result`} className="btn btn-secondary">
                        View result
                      </Link>
                    )}
                    <Link
                      href={`/member/quizzes/${quiz.slug}`}
                      className="btn btn-primary"
                    >
                      {inProgress ? "Resume quiz" : completed ? "Retake quiz" : "Take quiz"}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
