export default function Problem() {
  return (
    <section id="problem" className="section section-alt">
      <div className="container">
        <div className="problem-grid">
          <div className="problem-text">
            <h2 className="section-title">
              It&apos;s not hard. It&apos;s constant.
            </h2>
            <p className="section-lead">
              The invisible mental load: researching, coordinating, comparing,
              following up; doesn&apos;t fit in a status update. It&apos;s the
              work that runs in the background while you&apos;re already doing
              everything else.
            </p>
            <p className="section-body">
              You&apos;re capable. You&apos;re organized. The issue isn&apos;t
              skill; it&apos;s bandwidth. Mom Ops gives you a structured way to
              hand off the tasks that don&apos;t need to live in your head, so
              you can focus on what only you can do.
            </p>
          </div>
          <div className="problem-image-card">
            <img
              src="/assets/pta-email.png"
              alt="PTA email example: newsletter with logo and message about enrollment and family time."
              width={480}
              height={320}
              className="problem-image"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
