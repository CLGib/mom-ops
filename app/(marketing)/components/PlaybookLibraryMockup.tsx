type Playbook = {
  name: string;
  category: string;
  description: string;
  humanPolish?: boolean;
};

const PLAYBOOKS: Playbook[] = [
  {
    name: "Weekly Meal Plan",
    category: "Meals",
    description:
      "Pick a week. Get a plan tuned to your family, with a sorted grocery list and prep notes.",
    humanPolish: true,
  },
  {
    name: "Summer Camp Research",
    category: "Kids",
    description:
      "Vetted camp options for your kids' ages, with comparison and a clear recommendation.",
    humanPolish: true,
  },
  {
    name: "Birthday Party Plan",
    category: "Occasions",
    description:
      "Theme, timeline, vendor list, invitation copy, and a packing checklist for party day.",
    humanPolish: true,
  },
  {
    name: "Teacher Gifts",
    category: "Occasions",
    description:
      "Curated gift options for end of year, holidays, or appreciation week. Shoppable list included.",
  },
  {
    name: "Travel Packing List",
    category: "Travel",
    description:
      "A packing list shaped by destination, weather, kids' ages, and trip type. Nothing forgotten.",
  },
  {
    name: "School Email Drafter",
    category: "School",
    description:
      "Tell us what you need to say. Get a drafted, kind, professional email back in your voice.",
  },
  {
    name: "Pediatric Question Research",
    category: "Health",
    description:
      "A clear write-up of what current guidance says, with sources, before your next appointment.",
  },
  {
    name: "Family Calendar Coordination",
    category: "Admin",
    description:
      "A single coordinated view of school, sports, work, and personal across everyone in the household.",
    humanPolish: true,
  },
  {
    name: "Event Invitations",
    category: "Occasions",
    description:
      "Designed invitations and matching RSVP copy. Ready to send by text, email, or print.",
    humanPolish: true,
  },
  {
    name: "Recurring Family Systems",
    category: "Admin",
    description:
      "Set up a weekly or monthly routine that runs on its own — Sunday reset, school lunches, bill checks.",
  },
];

export default function PlaybookLibraryMockup() {
  return (
    <section id="playbooks" className="section section-alt">
      <div className="container container--wide">
        <h2 className="section-title">
          A library of household agents and playbooks.
        </h2>
        <p className="section-lead">
          Start with one. The system handles the rest.
        </p>
        <div
          style={{
            display: "grid",
            gap: "var(--space-md)",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            marginTop: "var(--space-lg)",
          }}
        >
          {PLAYBOOKS.map((p) => (
            <article key={p.name} className="card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-xs)",
                  marginBottom: "var(--space-xs)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--brand-gold, #B8860B)",
                    fontWeight: 600,
                  }}
                >
                  {p.category}
                </span>
                {p.humanPolish && (
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      background: "var(--accent-soft-bg, #F8F5ED)",
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Human polish available
                  </span>
                )}
              </div>
              <h3
                className="credits-card-title"
                style={{ marginBottom: "var(--space-xs)" }}
              >
                {p.name}
              </h3>
              <p className="credits-card-description">{p.description}</p>
            </article>
          ))}
        </div>
        <p
          className="section-body"
          style={{
            marginTop: "var(--space-lg)",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          More playbooks are rolling out as the library grows. Members get
          first access.
        </p>
      </div>
    </section>
  );
}
