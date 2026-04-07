import type { ReactNode } from "react";
import Link from "next/link";
import { formatInCentral } from "@/lib/format-date";
import { getStatusLabel } from "@/lib/ticket-status";
import { getAgeFromBirthday, deriveKidsDisplay } from "@/lib/age-from-birthday";
import { HOLIDAYS_BY_CATEGORY } from "@/lib/holidays-celebrated";

type HouseholdMember = {
  type?: string;
  name?: string;
  birthday?: string;
  likes?: string;
  dislikes?: string;
  clothing_size?: string;
  relation?: string;
};

export type CheckinQuizResultRow = {
  quiz_title?: string;
  outcome_title?: string;
  outcome_description?: string;
  completed_at?: string;
};

export type CheckinOnboardingRow = { answers?: Record<string, unknown>; created_at?: string };

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

const HOLIDAY_LABEL_BY_ID: Record<string, string> = Object.fromEntries(
  Object.values(HOLIDAYS_BY_CATEGORY).flatMap((list) => list.map((h) => [h.id, h.label]))
);

type CustomFieldDef = { key: string; label: string };

type TicketRow = { id: string; subject: string | null; status: string | null; updated_at: string };

type Props = {
  profile: Record<string, unknown>;
  quizResults: CheckinQuizResultRow[];
  onboardingList: CheckinOnboardingRow[];
  customFieldDefinitions: CustomFieldDef[];
  recentTickets: TicketRow[];
};

export default function CheckinMemberInsights({
  profile,
  quizResults,
  onboardingList,
  customFieldDefinitions,
  recentTickets,
}: Props) {
  const memberContext = profile;
  const hasProfileFields = Object.keys(memberContext).some((k) => {
    if (k === "member_id") return false;
    const v = memberContext[k];
    if (v == null || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0) return false;
    return true;
  });
  const hasAny =
    hasProfileFields || quizResults.length > 0 || onboardingList.length > 0 || recentTickets.length > 0;

  const holidayIds = Array.isArray((memberContext as { holidays_celebrated?: unknown }).holidays_celebrated)
    ? ((memberContext as { holidays_celebrated: string[] }).holidays_celebrated ?? []).filter(
        (id): id is string => typeof id === "string"
      )
    : [];

  return (
    <>
      {!hasAny && <p className="form-note">No profile or history details on file yet—use the task library for generic suggestions.</p>}

      {memberContext && (
        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h2 className="section-heading">Profile</h2>
          <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
            Read-only for check-in. After you create and claim the check-in task, you can update the profile from the task.
          </p>
          <div className="card" style={{ padding: "var(--space-md)" }}>
            <dl style={{ margin: 0, display: "grid", gap: "var(--space-xs)", fontSize: "0.9rem" }}>
              <div>
                <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Name</dt>
                <dd>
                  {(memberContext as { preferred_name?: string | null; full_name?: string | null }).preferred_name ||
                    (memberContext as { full_name?: string | null }).full_name ||
                    "-"}
                </dd>
              </div>
              {(memberContext as { partner_name?: string | null }).partner_name && (
                <div>
                  <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Partner</dt>
                  <dd>{(memberContext as { partner_name: string }).partner_name}</dd>
                </div>
              )}
              {(memberContext as { timezone?: string | null }).timezone && (
                <div>
                  <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Timezone</dt>
                  <dd>{(memberContext as { timezone: string }).timezone}</dd>
                </div>
              )}
              {((memberContext as { city?: string | null }).city || (memberContext as { state?: string | null }).state) && (
                <div>
                  <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Location</dt>
                  <dd>
                    {[(memberContext as { city?: string | null }).city, (memberContext as { state?: string | null }).state]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </dd>
                </div>
              )}
              {(() => {
                const kidsDisplay = deriveKidsDisplay(memberContext);
                return kidsDisplay ? (
                  <div>
                    <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Kids</dt>
                    <dd>{kidsDisplay}</dd>
                  </div>
                ) : null;
              })()}
              {Array.isArray((memberContext as { household_members?: unknown }).household_members) &&
                (memberContext as { household_members: HouseholdMember[] }).household_members.length > 0 && (
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
              {Array.isArray((memberContext as { schools?: unknown }).schools) &&
                (memberContext as { schools: { name?: string }[] }).schools.length > 0 && (
                  <div>
                    <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Schools</dt>
                    <dd>
                      {String(
                        (memberContext as { schools: { name?: string }[] }).schools.map((s) => s.name || "-").join("; ")
                      )}
                    </dd>
                  </div>
                )}
              {Array.isArray((memberContext as { activities?: unknown }).activities) &&
                (memberContext as { activities: { name?: string }[] }).activities.length > 0 && (
                  <div>
                    <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Activities</dt>
                    <dd>
                      {String(
                        (memberContext as { activities: { name?: string }[] }).activities.map((a) => a.name || "-").join("; ")
                      )}
                    </dd>
                  </div>
                )}
              {Array.isArray((memberContext as { preferred_stores?: unknown }).preferred_stores) &&
                (memberContext as { preferred_stores: { name?: string }[] }).preferred_stores.length > 0 && (
                  <div>
                    <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Preferred stores</dt>
                    <dd>
                      {String(
                        (memberContext as { preferred_stores: { name?: string }[] }).preferred_stores
                          .map((s) => s.name || "-")
                          .join("; ")
                      )}
                    </dd>
                  </div>
                )}
              {(memberContext as { constraints?: string | null }).constraints && (
                <div>
                  <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Constraints</dt>
                  <dd>{(memberContext as { constraints: string }).constraints}</dd>
                </div>
              )}
              {(memberContext as { communication_tone?: string | null }).communication_tone && (
                <div>
                  <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Tone</dt>
                  <dd style={{ textTransform: "capitalize" }}>
                    {(memberContext as { communication_tone: string }).communication_tone}
                  </dd>
                </div>
              )}
              {holidayIds.length > 0 && (
                <div>
                  <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Holidays celebrated</dt>
                  <dd>{holidayIds.map((id) => HOLIDAY_LABEL_BY_ID[id] ?? id).join(", ")}</dd>
                </div>
              )}
              {Array.isArray((memberContext as { important_dates?: unknown }).important_dates) &&
                (memberContext as { important_dates: { label?: string; date?: string }[] }).important_dates.length > 0 && (
                  <div>
                    <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Important dates</dt>
                    <dd>
                      {String(
                        (memberContext as { important_dates: { label?: string; date?: string }[] }).important_dates
                          .map((d) => `${d.label || "-"}: ${d.date || ""}`)
                          .join("; ")
                      )}
                    </dd>
                  </div>
                )}
              {Array.isArray((memberContext as { preferred_brands?: unknown }).preferred_brands) &&
                (memberContext as { preferred_brands: string[] }).preferred_brands.length > 0 && (
                  <div>
                    <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Preferred brands</dt>
                    <dd>{(memberContext as { preferred_brands: string[] }).preferred_brands.join(", ")}</dd>
                  </div>
                )}
              {((memberContext as { task_submission_preference?: string | null }).task_submission_preference ||
                (memberContext as { typical_turnaround?: string | null }).typical_turnaround) && (
                <div>
                  <dt style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Preferences</dt>
                  <dd>{`Task submission: ${(memberContext as { task_submission_preference?: string | null }).task_submission_preference || "-"} · Turnaround: ${(memberContext as { typical_turnaround?: string | null }).typical_turnaround || "-"}`}</dd>
                </div>
              )}
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

      {recentTickets.length > 0 && (
        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h2 className="section-heading">Recent tasks</h2>
          <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
            Use past subjects and timing to suggest relevant follow-ups.
          </p>
          <ul className="ticket-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {recentTickets.map((t) => (
              <li key={t.id} style={{ marginBottom: "var(--space-xs)" }}>
                <Link href={`/va/${t.id}`} className="link">
                  {t.subject ?? "(no subject)"}
                </Link>
                <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)" }}>
                  {getStatusLabel(t.status ?? "")} · {formatInCentral(t.updated_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
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
                {o.created_at && (
                  <p className="ticket-meta" style={{ marginBottom: "var(--space-xs)", fontSize: "0.8rem" }}>
                    {formatInCentral(o.created_at)}
                  </p>
                )}
                {o.answers && typeof o.answers === "object" && Object.keys(o.answers).length > 0 ? (
                  <dl style={{ margin: 0, fontSize: "0.9rem", display: "grid", gap: "var(--space-xs)" }}>
                    {Object.entries(o.answers).map(([key, val]) => {
                      const label =
                        ONBOARDING_KEY_LABELS[key as keyof typeof ONBOARDING_KEY_LABELS] ??
                        key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
                      let display: ReactNode;
                      if (key === "householdMembers" && Array.isArray(val)) {
                        const members = val as {
                          type?: string;
                          name?: string;
                          likes?: string;
                          dislikes?: string;
                          birthday?: string;
                          clothing_size?: string;
                          relation?: string;
                        }[];
                        display = members.map((m, j) => (
                          <div key={j} style={{ marginBottom: "var(--space-2xs)" }}>
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
    </>
  );
}
