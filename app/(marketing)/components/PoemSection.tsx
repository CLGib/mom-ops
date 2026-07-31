const STANZAS = [
  "I've always struggled answering the question, “What do you do?” The truth of the matter is I do a lot of things. I've always felt very competent in most activities (aside from spelling — God, I hate spelling) but never great.",
  "For the longest time I felt the need to be great — like the “best” at something, to prove some human worthiness or superpower, if you will.",
  "Turns out my superpower is in the average, and in the sum of all this averageness actually comes something pretty great. I grow things.",
  "As a mom, I am a makeshift nurse, counselor, artist, teacher, hostage negotiator and storyteller.",
  "In the world of start-ups, I am a marketer, operations manager, PM, quality assurance engineer and self-appointed goofball.",
  "But in the end, with patience, relentless attempts, and a can-do attitude, I make things grow. Children, companies, plants, you name it — I will pour my average array of skills and love in, till it grows into something great.",
];

export default function PoemSection() {
  return (
    <section className="section">
      <div className="container">
        <p
          className="section-lead"
          style={{ textAlign: "center", marginBottom: "var(--space-lg)" }}
        >
          It started with a poem I wrote years ago.
        </p>
        <blockquote className="poem">
          <h2 className="poem-title">What do you do?</h2>
          {STANZAS.map((s, i) => (
            <p key={i} className="poem-line">
              {s}
            </p>
          ))}
        </blockquote>
      </div>
    </section>
  );
}
