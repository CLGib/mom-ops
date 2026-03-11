import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";
import { getStatusLabel } from "@/lib/ticket-status";
import { getAgeFromBirthday, deriveKidsDisplay } from "@/lib/age-from-birthday";
import VAProfileEditForm from "./VAProfileEditForm";
import VANotesSection from "./VANotesSection";

type HouseholdMember = { type?: string; name?: string; birthday?: string; likes?: string; dislikes?: string; clothing_size?: string; relation?: string };

type QuizResultRow = { quiz_title?: string; outcome_title?: string; outcome_description?: string; completed_at?: string };
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

  const [{ data: memberContextRows }, { data: customFieldDefs }] = await Promise.all([
    supabase.rpc("get_va_member_context", { p_ticket_id: id }),
    supabase
      .from("member_profile_custom_field_definitions")
      .select("id, key, label, field_type, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("key", { ascending: true }),
  ]);
  const memberContext = Array.isArray(memberContextRows) && memberContextRows.length > 0 ? memberContextRows[0] : null;
  const customFieldDefinitions = (customFieldDefs ?? []).map((d) => ({
    id: d.id,
    key: d.key ?? "",
    label: d.label ?? "",
    field_type: (d.field_type as "text" | "number" | "date" | "multiline") ?? "text",
    sort_order: typeof d.sort_order === "number" ? d.sort_order : 0,
  }));

  const { data: otherMemberTickets } =
    ticket.member_id != null
      ? await supabase
          .from("tickets")
          .select("id, subject, status, updated_at")
          .eq("member_id", ticket.member_id)
          .neq("id", id)
          .order("updated_at", { ascending: false })
      : { data: null };

  const { data: quizzesAndSurveys } = await supabase.rpc("get_va_member_quizzes_and_surveys", {
    p_ticket_id: id,
  });
  const raw = quizzesAndSurveys as { quiz_results?: QuizResultRow[]; onboarding?: OnboardingRow[] } | null;
  const quizResults: QuizResultRow[] = raw?.quiz_results ?? [];
  const onboardingList: OnboardingRow[] = raw?.onboarding ?? [];

  const hasAny = memberContext || quizResults.length > 0 || onboardingList.length > 0;

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
        Profile, quiz results, and survey responses (email not shown).
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
              household_members: Array.isArray((memberContext as { household_members?: unknown }).household_members)
                ? (memberContext as { household_members: HouseholdMember[] }).household_members.map((m) => ({ type: m.type ?? "other", name: m.name, likes: m.likes, dislikes: m.dislikes, birthday: m.birthday, clothing_size: m.clothing_size, relation: m.relation }))
                : null,
              important_dates: (memberContext as { important_dates?: { label: string; date: string; recurrence?: string }[] | null }).important_dates ?? null,
              custom_field_values: (memberContext as { custom_field_values?: Record<string, string | number | null> | null }).custom_field_values ?? null,
            }}
            customFieldDefinitions={customFieldDefinitions}
          />
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <dl style={{ margin: 0, display: "grid", gap: "var(--space-xs)", fontSize: "0.9rem" }}>
              <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Name</dt><dd>{(memberContext as { preferred_name?: string | null; full_name?: string | null }).preferred_name || (memberContext as { full_name?: string | null }).full_name || "-"}</dd></div>
              {(memberContext as { timezone?: string | null }).timezone && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Timezone</dt><dd>{(memberContext as { timezone: string }).timezone}</dd></div>}
              {((memberContext as { city?: string | null }).city || (memberContext as { state?: string | null }).state) && <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Location</dt><dd>{[(memberContext as { city?: string | null }).city, (memberContext as { state?: string | null }).state].filter(Boolean).join(", ") || "-"}</dd></div>}
              {(() => {
                const kidsDisplay = deriveKidsDisplay(memberContext);
                return kidsDisplay ? <div><dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Kids</dt><dd>{kidsDisplay}</dd></div> : null;
              })()}
              {Array.isArray((memberContext as { household_members?: unknown }).household_members) && (memberContext as { household_members: HouseholdMember[] }).household_members.length > 0 && (
                <div>
                  <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Important people</dt>
                  <dd>
                    {(memberContext as { household_members: HouseholdMember[] }).household_members.map((m, i) => {
                      const age = m.type === "kid" && m.birthday ? getAgeFromBirthday(m.birthday) : null;
                      return (
                        <div key={i} style={{ marginBottom: "var(--space-xs)" }}>
                          <strong style={{ textTransform: "capitalize" }}>{m.type}</strong>: {m.name || "-"}
                          {m.birthday && ` · Birthday: ${m.birthday}`}
                          {age != null && ` · Age: ${age}`}
                          {m.clothing_size && ` · Size: ${m.clothing_size}`}
                          {m.relation && ` · ${m.relation}`}
                          {m.likes && ` · Likes: ${m.likes}`}
                          {m.dislikes && ` · Dislikes: ${m.dislikes}`}
                        </div>
                      );
                    })}
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
              {(() => {
                const cv = (memberContext as { custom_field_values?: Record<string, unknown> | null }).custom_field_values;
                if (!cv || typeof cv !== "object" || Object.keys(cv).length === 0) return null;
                const labelsByKey = Object.fromEntries(customFieldDefinitions.map((d) => [d.key, d.label]));
                return (
                  <div>
                    <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Additional details</dt>
                    <dd>
                      {Object.entries(cv).map(([k, v]) => (
                        <div key={k} style={{ marginBottom: "var(--space-2xs)" }}>
                          <strong>{labelsByKey[k] ?? k}</strong>: {v != null ? String(v) : "-"}
                        </div>
                      ))}
                    </dd>
                  </div>
                );
              })()}
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

      {(otherMemberTickets?.length ?? 0) > 0 && (
        <section style={{ marginTop: "var(--space-xl)", marginBottom: "var(--space-lg)" }}>
          <h2 className="section-heading">Other tasks from this member</h2>
          <ul className="ticket-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {otherMemberTickets!.map((t) => (
              <li key={t.id} style={{ marginBottom: "var(--space-xs)" }}>
                <Link href={`/va/${t.id}`} className="link">
                  {t.subject}
                </Link>
                <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)" }}>
                  {getStatusLabel(t.status)} · {formatInCentral(t.updated_at)}
                </span>
              </li>
            ))}
          </ul>
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
