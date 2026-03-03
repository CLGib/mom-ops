import PostHogFunnelDashboard from "../../components/PostHogFunnelDashboard";

export const dynamic = "force-dynamic";

export default function CfoAnalyticsPage() {
  return (
    <main className="app-shell">
      <h1 className="page-title">Analytics</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Funnels, site traffic (page visits and source), and key metrics.
      </p>
      <PostHogFunnelDashboard />
    </main>
  );
}
