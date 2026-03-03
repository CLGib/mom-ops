import type { ReactNode } from "react";
import type { TaskLibraryItem } from "@/lib/task-library";
import ExploreTasksLibrary from "../../components/ExploreTasksLibrary";
const CATEGORY_ICONS: Record<string, ReactNode> = {
  "Events & Celebrations": (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  "School & Activities": (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  "Sourcing & Gifts": (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  ),
  "Organization & Admin": (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
};

const TASK_CATEGORIES = [
  { title: "Events & Celebrations", description: "Invitations, timelines, vendor research, signage." },
  { title: "School & Activities", description: "Camp comparisons, private school research, tutor sourcing." },
  { title: "Sourcing & Gifts", description: "Curated gift lists, outfit sourcing, holiday planning." },
  { title: "Organization & Admin", description: "Spreadsheets, comparison tables, polished communication." },
];

const TOKEN_CARDS = [
  { label: "10 Task Credits", price: "$15" },
  { label: "30 Task Credits", price: "$39" },
  { label: "50 Task Credits", price: "$59" },
];

type CreditsProps = {
  /** When provided, skip async fetch (for static pages like /founders). */
  tasks?: TaskLibraryItem[];
  categories?: string[];
};

export default async function Credits(props: CreditsProps) {
  let tasks: TaskLibraryItem[];
  let categories: string[];
  if (props.tasks != null && props.categories != null) {
    tasks = props.tasks;
    categories = props.categories;
  } else {
    const { getTaskLibrary, getCategories } = await import("@/lib/task-library");
    [tasks, categories] = await Promise.all([getTaskLibrary(), getCategories()]);
  }

  return (
    <section id="credits" className="section">
      <div className="container">
        <h2 className="section-title">What Can You Send Us?</h2>
        <p className="section-lead credits-intro">
          Common requests with standard Task Credit pricing. Not listed? Email
          us; we&apos;ll confirm scope and credit amount before starting.
        </p>

        <div className="credits-card-grid">
          {TASK_CATEGORIES.map((cat) => (
            <article key={cat.title} className="credits-card">
              <div className="credits-card-icon">
                {CATEGORY_ICONS[cat.title]}
              </div>
              <h3 className="credits-card-title">{cat.title}</h3>
              <p className="credits-card-description">{cat.description}</p>
            </article>
          ))}
        </div>

        <div className="credits-task-library">
          <h3 className="credits-accordion-title" style={{ marginBottom: "var(--space-md)" }}>
            Search our task library
          </h3>
          <ExploreTasksLibrary tasks={tasks} categories={categories} mode="guest" showOnlyWhenFiltered />
        </div>

        <p className="section-lead" style={{ marginTop: "var(--space-xl)", marginBottom: "var(--space-lg)" }}>
          Don&apos;t see what you&apos;re looking for? Just ask. Think Moms—we&apos;re sure we can help.
        </p>

        <p className="credits-custom-note">
          Custom requests welcome; we&apos;ll quote credits before we begin. More
          Task Credits available in the member portal; purchased credits never
          expire.
        </p>
        <div className="token-cards">
          {TOKEN_CARDS.map((card) => (
            <div key={card.label} className="token-card">
              <h4>{card.label}</h4>
              <p>{card.price}</p>
            </div>
          ))}
        </div>

        <div className="credits-scope-full">
          <p className="scope-guardrail">
            We handle structured administrative and creative support. We do
            not provide legal, medical, financial advisory, or urgent same-day
            services.
          </p>
          <p className="section-body section-body--tight scope-note">
            Task Credits represent defined units of structured support, so
            delegation feels effortless, not like another decision to calculate.
          </p>
        </div>
      </div>
    </section>
  );
}
