const TOPICS = [
  "AI",
  "Business",
  "Parenthood",
  "Operations",
  "Marketing",
  "Websites",
  "Product",
  "Life",
  "Experiments",
  "Books",
  "Systems",
];

export default function FollowMyBrain() {
  return (
    <section className="section section-alt">
      <div className="container">
        <h2 className="section-title">Follow my brain</h2>
        <p className="section-lead">
          A slightly chaotic map of what I&apos;m usually thinking about.
        </p>
        <div className="brain-chips">
          {TOPICS.map((t) => (
            <a key={t} href="#newsletter" className="brain-chip">
              {t}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
