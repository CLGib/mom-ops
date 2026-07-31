const QUESTIONS = [
  "How did you build that website?",
  "How are you doing the work of five people?",
  "How did you automate that?",
  "What AI tool is that?",
  "Where did you learn this?",
  "How do you have time for all of this with two kids?",
];

export default function HolyCow() {
  return (
    <section className="section section-alt">
      <div className="container">
        <h2 className="section-title">&ldquo;Holy cow&hellip; how did you do that?&rdquo;</h2>
        <p className="section-lead">People ask me questions like&hellip;</p>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "var(--space-lg) 0",
            display: "grid",
            gap: "var(--space-sm)",
          }}
        >
          {QUESTIONS.map((q) => (
            <li
              key={q}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.15rem, 2.5vw, 1.5rem)",
                color: "var(--text)",
                lineHeight: 1.35,
              }}
            >
              &ldquo;{q}&rdquo;
            </li>
          ))}
        </ul>
        <p className="section-lead" style={{ fontWeight: 600, color: "var(--text)" }}>
          This website is my answer.
        </p>
      </div>
    </section>
  );
}
