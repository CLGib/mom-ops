import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm, { type ProfileFormData } from "./ProfileForm";

export const dynamic = "force-dynamic";

function toFormData(row: Record<string, unknown> | null): ProfileFormData {
  if (!row) {
    return {
      full_name: null,
      preferred_name: null,
      city: null,
      state: null,
      timezone: null,
      partner_name: null,
      kids_count: null,
      kids_ages: null,
      schools: null,
      activities: null,
      preferred_stores: null,
      preferred_brands: null,
      communication_tone: null,
      constraints: null,
      important_dates: null,
      task_submission_preference: null,
      typical_turnaround: null,
    };
  }
  return {
    full_name: (row.full_name as string | null) ?? null,
    preferred_name: (row.preferred_name as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    state: (row.state as string | null) ?? null,
    timezone: (row.timezone as string | null) ?? null,
    partner_name: (row.partner_name as string | null) ?? null,
    kids_count: typeof row.kids_count === "number" ? row.kids_count : null,
    kids_ages: Array.isArray(row.kids_ages) ? (row.kids_ages as number[]) : null,
    schools: Array.isArray(row.schools)
      ? (row.schools as { name?: string; city?: string; notes?: string }[]).map((s) => ({
          name: String(s?.name ?? ""),
          city: s?.city != null ? String(s.city) : undefined,
          notes: s?.notes != null ? String(s.notes) : undefined,
        }))
      : null,
    activities: Array.isArray(row.activities)
      ? (row.activities as { name?: string; schedule?: string; notes?: string }[]).map((a) => ({
          name: String(a?.name ?? ""),
          schedule: a?.schedule != null ? String(a.schedule) : undefined,
          notes: a?.notes != null ? String(a.notes) : undefined,
        }))
      : null,
    preferred_stores: Array.isArray(row.preferred_stores) ? (row.preferred_stores as string[]) : null,
    preferred_brands: Array.isArray(row.preferred_brands) ? (row.preferred_brands as string[]) : null,
    communication_tone: (row.communication_tone as "warm" | "direct" | "formal" | null) ?? null,
    constraints: (row.constraints as string | null) ?? null,
    important_dates: Array.isArray(row.important_dates)
      ? (row.important_dates as { label?: string; date?: string; recurrence?: string }[]).map((d) => ({
          label: String(d?.label ?? ""),
          date: String(d?.date ?? ""),
          recurrence: d?.recurrence != null ? String(d.recurrence) : undefined,
        }))
      : null,
    task_submission_preference: (row.task_submission_preference as "email" | "portal" | "either" | null) ?? null,
    typical_turnaround: (row.typical_turnaround as "standard" | "rush_when_possible" | null) ?? null,
  };
}

export default async function MemberProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/member/profile"));

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, preferred_name, city, state, timezone, partner_name, kids_count, kids_ages, schools, activities, preferred_stores, preferred_brands, communication_tone, constraints, important_dates, task_submission_preference, typical_turnaround")
    .eq("id", user.id)
    .single();

  const [quizzesRes, resultsRes, responsesRes] = await Promise.all([
    supabase.from("quizzes").select("id, slug, title, description").order("created_at", { ascending: true }),
    supabase.from("quiz_results").select("quiz_id, outcome_slug, outcome_title, completed_at").eq("member_id", user.id).order("completed_at", { ascending: false }),
    supabase.from("quiz_responses").select("quiz_id, status").eq("member_id", user.id),
  ]);

  const quizzes = quizzesRes.data ?? [];
  const resultsByQuiz = new Map((resultsRes.data ?? []).map((r) => [r.quiz_id, r]));
  const responseByQuiz = new Map((responsesRes.data ?? []).map((r) => [r.quiz_id, r]));

  const initial = toFormData(profile ?? null);
  return (
    <main className="app-shell">
      <h1 className="page-title">Profile</h1>
      <div className="card">
        <ProfileForm memberId={user.id} initial={initial} />
      </div>

      {quizzes.length > 0 && (
        <section className="card mt-6">
          <h2 className="section-heading">Quizzes</h2>
          <p className="text-sm text-gray-600 mb-4">
            Quick quizzes help your VA understand your style and suggest better support.
          </p>
          <ul className="space-y-3">
            {quizzes.map((quiz) => {
              const result = resultsByQuiz.get(quiz.id);
              const response = responseByQuiz.get(quiz.id);
              const inProgress = response?.status === "in_progress";
              return (
                <li key={quiz.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <span className="font-medium">{quiz.title}</span>
                    {result && (
                      <span className="ml-2 text-sm text-gray-500">— {result.outcome_title}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {result ? (
                      <Link
                        href={`/member/quizzes/${quiz.slug}/result`}
                        className="btn btn-secondary text-sm"
                      >
                        View result
                      </Link>
                    ) : null}
                    <Link
                      href={`/member/quizzes/${quiz.slug}`}
                      className="btn btn-primary text-sm"
                    >
                      {inProgress ? "Resume quiz" : result ? "Retake quiz" : "Take quiz"}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
