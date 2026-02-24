const TASK_CATEGORIES = [
  {
    title: "Event & Celebration",
    items: [
      "Birthday invitation design — 15 Task Credits",
      "Holiday card layout — 30 Task Credits",
      "Party timeline + checklist — 40 Task Credits",
      "Vendor research (3 options) — 25 Task Credits",
      "Printable signage set (up to 3 pieces) — 35 Task Credits",
    ],
  },
  {
    title: "School & Activity Research",
    items: [
      "Summer camp comparison (up to 5 options) — 45 Task Credits",
      "Private school comparison (up to 5 schools) — 60 Task Credits",
      "After-school activity shortlist (3 options) — 20 Task Credits",
      "Tutor research (3 options) — 20 Task Credits",
    ],
  },
  {
    title: "Sourcing & Gifts",
    items: [
      "Teacher gift ideas (3 curated options) — 10 Task Credits",
      "Holiday gift shortlist (per person) — 12 Task Credits",
      "Event outfit sourcing (3 options) — 15 Task Credits",
    ],
  },
  {
    title: "Organization & Admin",
    items: [
      "Spreadsheet cleanup or formatting — 20 Task Credits",
      "Comparison table creation — 25 Task Credits",
      "Vendor email draft — 10 Task Credits",
      "Polished communication draft — 8 Task Credits",
    ],
  },
];

const TOKEN_CARDS = [
  { label: "100 Task Credits", price: "$79" },
  { label: "250 Task Credits", price: "$179" },
  { label: "500 Task Credits", price: "$329" },
];

export default function Credits() {
  return (
    <section id="credits" className="section">
      <div className="container">
        <h2 className="section-title">What Can You Send Us?</h2>
        <p className="section-lead">
          Below are common requests with standard Task Credit pricing. If your
          task isn&apos;t listed, just email us—we&apos;ll confirm scope and
          give you a clear credit amount before starting.
        </p>
        <p className="section-body section-body--tight">
          No surprises. No guessing.
        </p>

        <h3 className="tasks-part-title">Pre-Priced Tasks</h3>
        <div className="task-categories">
          {TASK_CATEGORIES.map((cat) => (
            <div key={cat.title} className="task-category">
              <h4 className="task-category-title">{cat.title}</h4>
              <ul className="task-list">
                {cat.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <h3 className="tasks-part-title">Custom Requests</h3>
        <p className="section-body">
          If you don&apos;t see your task listed, simply email us. We&apos;ll
          review it, confirm scope, and tell you how many Task Credits it will
          use before we begin. You always approve the amount first.
        </p>
        <p className="section-body">
          Need more Task Credits? Additional packs are available in the member
          portal. Credits you purchase never expire.
        </p>
        <div className="token-cards">
          {TOKEN_CARDS.map((card) => (
            <div key={card.label} className="token-card">
              <h4>{card.label}</h4>
              <p>{card.price}</p>
            </div>
          ))}
        </div>

        <p className="scope-guardrail">
          We handle structured administrative and creative support. We do not
          provide legal, medical, financial advisory, or urgent same-day
          services.
        </p>
        <p className="section-body section-body--tight scope-note">
          Task Credits represent defined units of structured support—so
          delegation feels effortless, not like another decision to calculate.
        </p>
      </div>
    </section>
  );
}
