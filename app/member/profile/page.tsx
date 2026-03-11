import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm, { type ProfileFormData } from "./ProfileForm";
import AccountSettingsForm from "../../components/AccountSettingsForm";
import MyReviewsSection from "./MyReviewsSection";
import PublicProfileForm from "./PublicProfileForm";

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
      household_members: null,
      schools: null,
      activities: null,
      preferred_stores: null,
      preferred_brands: null,
      communication_tone: null,
      constraints: null,
      important_dates: null,
      task_submission_preference: null,
      typical_turnaround: null,
      holidays_celebrated: null,
    };
  }
  const rawHousehold = row.household_members;
  const household_members: ProfileFormData["household_members"] = Array.isArray(rawHousehold)
    ? (rawHousehold as Record<string, unknown>[]).map((m) => ({
        type: (m.type === "kid" || m.type === "spouse" || m.type === "other" ? m.type : "other") as "kid" | "spouse" | "other",
        name: m.name != null ? String(m.name) : undefined,
        likes: m.likes != null ? String(m.likes) : undefined,
        dislikes: m.dislikes != null ? String(m.dislikes) : undefined,
        birthday: m.birthday != null ? String(m.birthday) : undefined,
        clothing_size: m.clothing_size != null ? String(m.clothing_size) : undefined,
        relation: m.relation != null ? String(m.relation) : undefined,
      }))
    : null;
  return {
    full_name: (row.full_name as string | null) ?? null,
    preferred_name: (row.preferred_name as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    state: (row.state as string | null) ?? null,
    timezone: (row.timezone as string | null) ?? null,
    partner_name: (row.partner_name as string | null) ?? null,
    kids_count: typeof row.kids_count === "number" ? row.kids_count : null,
    kids_ages: Array.isArray(row.kids_ages) ? (row.kids_ages as number[]) : null,
    household_members,
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
    holidays_celebrated: Array.isArray(row.holidays_celebrated)
      ? (row.holidays_celebrated as string[])
      : null,
  };
}

export default async function MemberProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/member/profile"));

  const [{ data: profile }, { data: customFieldDefs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, preferred_name, display_name, avatar_url, city, state, timezone, partner_name, kids_count, kids_ages, household_members, schools, activities, preferred_stores, preferred_brands, communication_tone, constraints, important_dates, task_submission_preference, typical_turnaround, holidays_celebrated, custom_field_values")
      .eq("id", user.id)
      .single(),
    supabase
      .from("member_profile_custom_field_definitions")
      .select("id, key, label, field_type, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("key", { ascending: true }),
  ]);

  const [quizzesRes, resultsRes, responsesRes, reviewsRes] = await Promise.all([
    supabase.from("quizzes").select("id, slug, title, description").order("created_at", { ascending: true }),
    supabase.from("quiz_results").select("quiz_id, outcome_slug, outcome_title, completed_at").eq("member_id", user.id).order("completed_at", { ascending: false }),
    supabase.from("quiz_responses").select("quiz_id, status").eq("member_id", user.id),
    supabase.from("task_reviews").select("id, task_subject, rating, comment, visibility, created_at").eq("member_id", user.id).order("created_at", { ascending: false }),
  ]);

  const quizzes = quizzesRes.data ?? [];
  const resultsByQuiz = new Map((resultsRes.data ?? []).map((r) => [r.quiz_id, r]));
  const responseByQuiz = new Map((responsesRes.data ?? []).map((r) => [r.quiz_id, r]));
  const myReviews = (reviewsRes.data ?? []).map((r) => ({
    id: r.id,
    task_subject: r.task_subject ?? "Task",
    rating: r.rating ?? 0,
    comment: r.comment ?? null,
    visibility: (r.visibility === "public" ? "public" : "private") as "private" | "public",
    created_at: r.created_at ?? new Date().toISOString(),
  }));

  const initial = toFormData(profile ?? null);
  const customFieldValues = (profile as { custom_field_values?: Record<string, unknown> } | null)?.custom_field_values ?? null;
  const definitions = (customFieldDefs ?? []).map((d) => ({
    id: d.id,
    key: d.key ?? "",
    label: d.label ?? "",
    field_type: (d.field_type as "text" | "number" | "date" | "multiline") ?? "text",
    sort_order: typeof d.sort_order === "number" ? d.sort_order : 0,
  }));
  return (
    <main className="app-shell">
      <h1 className="page-title">Profile</h1>
      <section style={{ marginBottom: "var(--space-xl)" }}>
        <AccountSettingsForm initialEmail={user.email ?? ""} />
      </section>
      <PublicProfileForm
        memberId={user.id}
        initialDisplayName={profile?.display_name ?? null}
        initialAvatarUrl={profile?.avatar_url ?? null}
      />
      <div className="card">
        <ProfileForm
          memberId={user.id}
          initial={initial}
          customFieldDefinitions={definitions}
          customFieldValues={customFieldValues as Record<string, string | number | null> | null}
        />
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
                      <span className="ml-2 text-sm text-gray-500">- {result.outcome_title}</span>
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

      <MyReviewsSection reviews={myReviews} />
    </main>
  );
}
