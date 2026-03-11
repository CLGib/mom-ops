import Link from "next/link";
import HelpOtherMomsGraphic from "./HelpOtherMomsGraphic";

export const dynamic = "force-dynamic";

export default function VaApplyPage() {
  return (
    <main className="va-apply-landing">
      {/* Hero: headline + CTA + image */}
      <section className="va-apply-hero">
        <div className="va-apply-hero__copy">
          <h1>Join our team of virtual assistants</h1>
          <p>
            Real work. Real flexibility. Real impact on other moms. Get paid per task, work on your schedule, and help busy moms every day.
          </p>
          <Link href="/va-apply/quiz" className="btn btn-primary">
            Apply now
          </Link>
        </div>
        <div className="va-apply-hero__img">
          <img
            src="/assets/va-apply-hero.png"
            alt="VA working from home at the kitchen table with laptop"
            width={720}
            height={480}
          />
        </div>
      </section>

      {/* Compensation: copy left, payout screenshot right */}
      <section className="va-apply-section">
        <div className="va-apply-section__copy">
          <h2>Compensation</h2>
          <p>
            Get paid per task you complete. Earn bonuses for great reviews and on-time delivery. Tips from members go directly to you. We believe in paying fairly for the work you do. No hourly minimums to chase, just clear tasks and clear pay.
          </p>
        </div>
        <div className="va-apply-section__visual">
          <img
            src="/assets/va-apply-payout.png"
            alt="VA dashboard showing payout: total payout, tips, 20% per credit + tips, and rating"
            width={720}
            height={480}
          />
        </div>
      </section>

      {/* Help other moms: copy left, example task right */}
      <section className="va-apply-section">
        <div className="va-apply-section__copy">
          <h2>Help other moms</h2>
          <p>
            You&apos;ll work directly with moms who need an extra pair of hands: scheduling, research, light admin, and real-life tasks that make a difference. There&apos;s something special about supporting another mom when she&apos;s juggling it all. Our members and our VAs are on the same team.
          </p>
        </div>
        <div className="va-apply-section__visual">
          <HelpOtherMomsGraphic />
        </div>
      </section>

      {/* On-demand flexibility: copy left, image right (same image as hero) */}
      <section className="va-apply-section va-apply-section--reverse">
        <div className="va-apply-section__copy">
          <h2>On-demand flexibility</h2>
          <p>
            Pick up tasks when it works for you. No fixed schedule, no minimum hours. Work from home, between school drop-off and pickup, or in the evenings. You choose when you&apos;re available and what you take on. We built this for flexibility because we know what life looks like.
          </p>
        </div>
        <div className="va-apply-section__visual">
          <img
            src="/assets/va-apply-flexibility.png"
            alt=""
            width={720}
            height={480}
          />
          <p
            className="form-note"
            style={{
              margin: 0,
              padding: "var(--space-md) var(--space-lg)",
              fontSize: "0.9rem",
              textAlign: "center",
              borderTop: "1px solid var(--border)",
            }}
          >
            Work from home. Between drop-off and pickup. On your schedule.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="va-apply-cta">
        <h2>Ready to apply?</h2>
        <p>You&apos;ll complete a short quiz so we can learn a bit about your attention to detail and how you think. We&apos;ll be in touch after we review.</p>
        <Link href="/va-apply/quiz" className="btn btn-primary">
          Apply now
        </Link>
      </section>
    </main>
  );
}
