type Helper = {
  name: string;
  category: string;
  description: string;
  humanPolish?: boolean;
};

const HELPERS: Helper[] = [
  {
    name: "Meal Plan Helper",
    category: "Meals",
    description:
      "Pick a week. Get a plan tuned to your family, with a sorted grocery list and prep notes.",
    humanPolish: true,
  },
  {
    name: "Summer Camp Research Helper",
    category: "Kids",
    description:
      "Vetted camp options for your kids' ages, with comparison and a clear recommendation.",
    humanPolish: true,
  },
  {
    name: "Birthday Party Helper",
    category: "Occasions",
    description:
      "Theme, timeline, vendor list, invitation copy, and a packing checklist for party day.",
    humanPolish: true,
  },
  {
    name: "Teacher Gift Helper",
    category: "Occasions",
    description:
      "Curated gift options for end of year, holidays, or appreciation week. Shoppable list included.",
  },
  {
    name: "Travel Packing Helper",
    category: "Travel",
    description:
      "A packing list shaped by destination, weather, kids' ages, and trip type. Nothing forgotten.",
  },
  {
    name: "School Email Helper",
    category: "School",
    description:
      "Tell us what you need to say. Get a drafted, kind, professional email back in your voice.",
  },
  {
    name: "Pediatric Question Helper",
    category: "Health",
    description:
      "A clear write-up of what current guidance says, with sources, before your next appointment.",
  },
  {
    name: "Family Calendar Helper",
    category: "Admin",
    description:
      "A single coordinated view of school, sports, work, and personal across everyone in the household.",
    humanPolish: true,
  },
  {
    name: "Event Invitation Helper",
    category: "Occasions",
    description:
      "Designed invitations and matching RSVP copy. Ready to send by text, email, or print.",
    humanPolish: true,
  },
  {
    name: "Routine Setup Helper",
    category: "Admin",
    description:
      "Set up a weekly or monthly routine that runs on its own — Sunday reset, school lunches, bill checks.",
  },
];

export default function HelperLibraryMockup() {
  return (
    <section id="helpers" className="section section-alt">
      <div className="container container--wide">
        <h2 className="section-title">
          A library of household helpers.
        </h2>
        <p className="section-lead">
          Each helper handles one kind of family work. Bring one in whenever
          you need it.
        </p>
        <div
          style={{
            display: "grid",
            gap: "var(--space-md)",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            marginTop: "var(--space-lg)",
          }}
        >
          {HELPERS.map((h) => (
            <article key={h.name} className="card">
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
                  {h.category}
                </span>
                {h.humanPolish && (
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
                {h.name}
              </h3>
              <p className="credits-card-description">{h.description}</p>
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
          More helpers are joining the library every week. Members get first
          access.
        </p>
      </div>
    </section>
  );
}
