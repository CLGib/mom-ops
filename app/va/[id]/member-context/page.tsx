import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";
import VAProfileEditForm from "./VAProfileEditForm";
import VANotesSection from "./VANotesSection";

type QuizResultRow = { quiz_title?: string; outcome_title?: string; outcome_description?: string; completed_at?: string };
type QuizResponseRow = { quiz_title?: string; quiz_slug?: string; status?: string; answers?: Record<string, unknown> };
type OnboardingRow = { answers?: Record<string, unknown>; created_at?: string };

const ONBOARDING_KEY_LABELS: Record<string, string> = {
  helpWanted: "Help wanted",
  goalsToWorkOn: "Goals / priorities",
  tone: "Communication tone",
  kidsCount: "Number of kids",
  kidsAges: "Kids ages",
  householdMembers: "Kids, spouse & other",
  constraints: "Constraints",
  constraintsOther: "Constraints (other)",
  preferredBrands: "Preferred brands",
  preferredBrandsOther: "Preferred brands (other)",
  upcoming: "Coming up (next 30 days)",
  timezone: "Timezone",
  city: "City",
  state: "State",
  task_submission_preference: "Task submission preference",
  typical_turnaround: "Typical turnaround",
};

export default async function VAMemberContextPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va"));

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, subject, assigned_va_id, member_id")
    .eq("id", id)
    .single();

  if (!ticket || ticket.assigned_va_id !== user.id) notFound();

  const { data: memberContextRows } = await supabase.rpc("get_va_member_context", {
    p_ticket_id: id,
  });
  const memberContext = Array.isArray(memberContextRows) && memberContextRows.length > 0 ? memberContextRows[0] : null;

  const { data: quizzesAndSurveys } = await supabase.rpc("get_va_member_quizzes_and_surveys", {
    p_ticket_id: id,
  });
  const raw = quizzesAndSurveys as { quiz_results?: QuizResultRow[]; quiz_responses?: QuizResponseRow[]; onboarding?: OnboardingRow[] } | null;
  const quizResults: QuizResultRow[] = raw?.quiz_results ?? [];
  const quizResponses: QuizResponseRow[] = raw?.quiz_responses ?? [];
  const onboardingList: OnboardingRow[] = raw?.onboarding ?? [];

  const hasAny = memberContext || quizResults.length > 0 || quizResponses.length > 0 || onboardingList.length > 0;

  return (
    <main className="app-shell">
      <Link href={`/va/${id}`} className="back-link">
        ← Back to task
      </Link>
      <h1 className="page-title">Member context</h1>
      <p className="ticket-meta" style={{ marginBottom: "var(--space-lg)" }}>
        Task: {ticket.subject}
      </p>
      <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
        Profile, quiz answers, and survey responses (email not shown).
      </p>

      {!hasAny && (
        <p className="form-note">No member context available for this task.</p>
      )}

      {memberContext && (
        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h2 className="section-heading">Profile</h2>
          <VAProfileEditForm
            ticketId={id}
            memberId={(memberContext as { member_id?: string }).member_id ?? ""}
            initial={{
              member_id: (memberContext as { member_id?: string }).member_id,
              constraints: (memberContext as { constraints?: string | null }).constraints,
              preferred_brands: (memberContext as { preferred_brands?: string[] | null }).preferred_brands,
              communication_tone: (memberContext as { communication_tone?: string | null }).communication_tone,
              kids_count: (memberContext as { kids_count?: number | null }).kids_count,
              kids_ages: (memberContext as { kids_ages?: number[] | null }).kids_ages,
              partner_name: (memberContext as { partner_name?: string | null }).partner_name,
            }}
          />
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <dl style={{ margin: 0, display: "grid", gap: "var(--space-xs)", fontSize: "0.9rem" }}>
              <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Name</dt><dd>{(memberContext as { preferred_name?: string | null; full_name?: string | null }).preferred_name || (memberContext as { full_name?: string | null }).full_name || "-"}</dd></div>
              {(memberContext as { timezone?: string | null }).timezone && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Timezone</dt><dd>{(memberContext as { timezone: string }).timezone}</dd></div>}
              {((memberContext as { city?: string | null }).city || (memberContext as { state?: string | null }).state) && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Location</dt><dd>{[(memberContext as { city?: string | null }).city, (memberContext as { state?: string | null }).state].filter(Boolean).join(", ") || "-"}</dd></div>}
              {(((memberContext as { kids_count?: number | null }).kids_count != null) || (Array.isArray((memberContext as { kids_ages?: unknown }).kids_ages) && (memberContext as { kids_ages: unknown[] }).kids_ages.length > 0)) && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Kids</dt><dd>{String((memberContext as { kids_count?: number | null }).kids_count != null ? `Count: ${(memberContext as { kids_count: number }).kids_count}` : "")}{String(Array.isArray((memberContext as { kids_ages?: unknown }).kids_ages) ? ` · Ages: ${(memberContext as { kids_ages: unknown[] }).kids_ages.join(", ")}` : "")}</dd></div>}
              {Array.isArray((memberContext as { household_members?: unknown }).household_members) && (memberContext as { household_members: { type?: string; name?: string; likes?: string; dislikes?: string; birthday?: string; clothing_size?: string; relation?: string }[] }).household_members.length > 0 && (
                <div>
                  <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Household (kids, spouse, other)</dt>
                  <dd>
                    {(memberContext as { household_members: { type?: string; name?: string; likes?: string; dislikes?: string; birthday?: string; clothing_size?: string; relation?: string }[] }).household_members.map((m, i) => (
                      <div key={i} style={{ marginBottom: "var(--space-xs)" }}>
                        <strong style={{ textTransform: "capitalize" }}>{m.type}</strong>: {m.name || "-"}
                        {m.birthday && ` · Birthday: ${m.birthday}`}
                        {m.clothing_size && ` · Size: ${m.clothing_size}`}
                        {m.relation && ` · ${m.relation}`}
                        {m.likes && ` · Likes: ${m.likes}`}
                        {m.dislikes && ` · Dislikes: ${m.dislikes}`}
                      </div>
                    ))}
                  </dd>
                </div>
              )}
              {Array.isArray((memberContext as { schools?: unknown }).schools) && (memberContext as { schools: { name?: string }[] }).schools.length > 0 && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Schools</dt><dd>{String((memberContext as { schools: { name?: string }[] }).schools.map((s) => s.name || "-").join("; "))}</dd></div>}
              {Array.isArray((memberContext as { activities?: unknown }).activities) && (memberContext as { activities: { name?: string }[] }).activities.length > 0 && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Activities</dt><dd>{String((memberContext as { activities: { name?: string }[] }).activities.map((a) => a.name || "-").join("; "))}</dd></div>}
              {(memberContext as { constraints?: string | null }).constraints && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Constraints</dt><dd>{(memberContext as { constraints: string }).constraints}</dd></div>}
              {(memberContext as { communication_tone?: string | null }).communication_tone && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Tone</dt><dd style={{ textTransform: "capitalize" }}>{(memberContext as { communication_tone: string }).communication_tone}</dd></div>}
              {Array.isArray((memberContext as { important_dates?: unknown }).important_dates) && (memberContext as { important_dates: { label?: string; date?: string }[] }).important_dates.length > 0 && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Important dates</dt><dd>{String((memberContext as { important_dates: { label?: string; date?: string }[] }).important_dates.map((d) => `${d.label || "-"}: ${d.date || ""}`).join("; "))}</dd></div>}
              {Array.isArray((memberContext as { preferred_brands?: unknown }).preferred_brands) && (memberContext as { preferred_brands: string[] }).preferred_brands.length > 0 && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Preferred brands</dt><dd>{(memberContext as { preferred_brands: string[] }).preferred_brands.join(", ")}</dd></div>}
              {((memberContext as { task_submission_preference?: string | null }).task_submission_preference || (memberContext as { typical_turnaround?: string | null }).typical_turnaround) && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Preferences</dt><dd>{`Task submission: ${(memberContext as { task_submission_preference?: string | null }).task_submission_preference || "-"} · Turnaround: ${(memberContext as { typical_turnaround?: string | null }).typical_turnaround || "-"}`}</dd></div>}
            </dl>
          </div>
        </section>
      )}

      {ticket.member_id && (
        <VANotesSection ticketId={id} memberId={ticket.member_id} />
      )}

      {quizResults.length > 0 && (
        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h2 className="section-heading">Quiz results</h2>
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem" }}>
              {quizResults.map((r, i) => (
                <li key={i} style={{ marginBottom: "var(--space-xs)" }}>
                  <strong>{r.quiz_title ?? "Quiz"}</strong>: {r.outcome_title ?? ""}
                  {r.outcome_description && `. ${r.outcome_description}`}
                  {r.completed_at && ` (${formatInCentral(r.completed_at)})`}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {quizResponses.length > 0 && (
        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h2 className="section-heading">Quiz answers</h2>
          <div className="card" style={{ padding: "var(--space-md)" }}>
            {quizResponses.map((r, i) => (
              <div key={i} style={{ marginBottom: "var(--space-md)" }}>
                <p style={{ fontWeight: 600, marginBottom: "var(--space-2xs)", fontSize: "0.9rem" }}>{r.quiz_title ?? r.quiz_slug ?? "Quiz"}</p>
                <p className="ticket-meta" style={{ marginBottom: "var(--space-xs)", fontSize: "0.8rem" }}>Status: {r.status ?? "-"}</p>
                {r.answers && typeof r.answers === "object" && Object.keys(r.answers).length > 0 && (
                  <dl style={{ margin: 0, fontSize: "0.85rem", display: "grid", gap: "var(--space-2xs)" }}>
                    {Object.entries(r.answers).map(([key, val]) => (
                      <div key={key}>
                        <dt style={{ fontWeight: 500, display: "inline" }}>{key}: </dt>
                        <dd style={{ display: "inline", margin: 0 }}>
                          {Array.isArray(val) ? val.join(", ") : typeof val === "object" && val !== null ? JSON.stringify(val) : String(val ?? "-")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {onboardingList.length > 0 && (
        <section>
          <h2 className="section-heading">Onboarding survey</h2>
          <div className="card" style={{ padding: "var(--space-md)" }}>
            {onboardingList.map((o, i) => (
              <div key={i}>
                {o.created_at && <p className="ticket-meta" style={{ marginBottom: "var(--space-xs)", fontSize: "0.8rem" }}>{formatInCentral(o.created_at)}</p>}
                {o.answers && typeof o.answers === "object" && Object.keys(o.answers).length > 0 ? (
                  <dl style={{ margin: 0, fontSize: "0.9rem", display: "grid", gap: "var(--space-xs)" }}>
                    {Object.entries(o.answers).map(([key, val]) => {
                      const label = ONBOARDING_KEY_LABELS[key as keyof typeof ONBOARDING_KEY_LABELS] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
                      let display: React.ReactNode;
                      if (key === "householdMembers" && Array.isArray(val)) {
                        const members = val as { type?: string; name?: string; likes?: string; dislikes?: string; birthday?: string; clothing_size?: string; relation?: string }[];
                        display = members.map((m, i) => (
                          <div key={i} style={{ marginBottom: "var(--space-2xs)" }}>
                            <strong style={{ textTransform: "capitalize" }}>{m.type}</strong>: {m.name || "-"}
                            {m.birthday && ` · Birthday: ${m.birthday}`}
                            {m.clothing_size && ` · Size: ${m.clothing_size}`}
                            {m.relation && ` · ${m.relation}`}
                            {m.likes && ` · Likes: ${m.likes}`}
                            {m.dislikes && ` · Dislikes: ${m.dislikes}`}
                          </div>
                        ));
                      } else if (Array.isArray(val)) {
                        display = val.join(", ");
                      } else if (typeof val === "object" && val !== null) {
                        display = JSON.stringify(val);
                      } else {
                        display = String(val ?? "-");
                      }
                      return (
                        <div key={key}>
                          <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>{label}</dt>
                          <dd style={{ margin: 0 }}>{display}</dd>
                        </div>
                      );
                    })}
                  </dl>
                ) : (
                  <p className="form-note">No answers</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <p style={{ marginTop: "var(--space-xl)" }}>
        <Link href={`/va/${id}`} className="btn btn-secondary">
          ← Back to task
        </Link>
      </p>
    </main>
  );
}
