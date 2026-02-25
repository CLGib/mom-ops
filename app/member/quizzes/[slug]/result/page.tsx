import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function QuizResultPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, slug, title")
    .eq("slug", slug)
    .single();

  if (!quiz) {
    notFound();
  }

  const { data: result } = await supabase
    .from("quiz_results")
    .select("id, outcome_slug, outcome_title, outcome_description, completed_at")
    .eq("member_id", user.id)
    .eq("quiz_id", quiz.id)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!result) {
    return (
      <main className="app-shell">
        <h1 className="page-title">Quiz result</h1>
        <div className="card">
          <p className="mb-4">You haven&apos;t completed this quiz yet.</p>
          <Link href={`/member/quizzes/${slug}`} className="btn btn-primary">
            Take {quiz.title}
          </Link>
          <p className="mt-4">
            <Link href="/member/profile" className="link">
              Back to profile
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <h1 className="page-title">Your result</h1>
      <div className="card">
        <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>
          {result.outcome_title}
        </h2>
        {result.outcome_description && (
          <p className="text-gray-700 mb-6" style={{ whiteSpace: "pre-wrap" }}>
            {result.outcome_description}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href="/member/profile" className="btn btn-primary">
            Back to profile
          </Link>
          <Link href={`/member/quizzes/${slug}`} className="btn btn-secondary">
            Take another quiz
          </Link>
        </div>
      </div>
    </main>
  );
}
