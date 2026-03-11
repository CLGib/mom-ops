import VaApplyQuizForm from "./VaApplyQuizForm";

export const dynamic = "force-dynamic";

export default function VaApplyQuizPage() {
  return (
    <main className="app-shell app-shell--narrow">
      <h1 className="page-title">Apply to be a VA</h1>
      <p className="section-lead" style={{ marginBottom: "var(--space-xl)" }}>
        Share your contact info and answer a few short questions. We&apos;ll review and be in touch.
      </p>
      <VaApplyQuizForm />
    </main>
  );
}
