import SupporterButton from "./SupporterButton";

/**
 * "The Regulars" pitch + join button. `bare` renders just the card (no section
 * wrapper) for embedding inside another page's container.
 */
export default function TheRegulars({ bare = false }: { bare?: boolean }) {
  const card = (
    <div className="regulars card card--highlight">
      <p className="eyebrow" style={{ margin: 0 }}>The Regulars · $9.95/mo</p>
      <h2 className="section-title" style={{ marginTop: "var(--space-xs)" }}>
        Everyone deserves the good stuff.
      </h2>
      <p className="section-body">
        With AI, everyone has access to everything. But the overwhelm is real, the
        decision fatigue is real, and we end up doing nothing because there are just
        too many choices. So I dig through it and bring back curated education that is
        actually enjoyable to consume, relatable, and fun.
      </p>
      <p className="section-body">
        Become a Regular and you get <strong>everything I build on Mom Ops</strong>:
        every tool and micro-product, plus early access to the weekly stuff. Support
        the cause, and get the whole workshop while you are at it.
      </p>
      <div style={{ marginTop: "var(--space-md)" }}>
        <SupporterButton />
      </div>
      <p className="form-note" style={{ marginTop: "var(--space-sm)" }}>
        Cancel anytime. No catch. If it is not for you, just hang out.
      </p>
    </div>
  );

  if (bare) return card;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 680 }}>{card}</div>
    </section>
  );
}
