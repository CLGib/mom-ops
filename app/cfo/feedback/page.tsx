import Link from "next/link";
import FeedbackRequestForm from "../../components/FeedbackRequestForm";

export const dynamic = "force-dynamic";

export default function CfoFeedbackPage() {
  return (
    <main className="app-shell">
      <h1 className="page-title">Request a Feature & Report Bug</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Submit a feature request or bug report. It will appear on the{" "}
        <Link href="/cfo/feature-bug" className="link">
          Feature &amp; Bug Log
        </Link>{" "}
        board.
      </p>
      <FeedbackRequestForm />
    </main>
  );
}
