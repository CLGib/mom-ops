"use client";

const EMBED_URL = process.env.NEXT_PUBLIC_POSTHOG_FUNNEL_DASHBOARD_EMBED_URL;

export default function PostHogFunnelDashboard() {
  if (!EMBED_URL || EMBED_URL.trim() === "") {
    return (
      <div className="card" style={{ padding: "var(--space-xl)" }}>
        <h2 className="section-heading">Analytics dashboard</h2>
        <p className="form-note" style={{ marginBottom: 0 }}>
          Configure <code>NEXT_PUBLIC_POSTHOG_FUNNEL_DASHBOARD_EMBED_URL</code> with your PostHog
          dashboard embed URL (Share → enable public sharing → copy embed iframe src).
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <iframe
        src={EMBED_URL}
        title="PostHog analytics dashboard"
        style={{
          width: "100%",
          minHeight: "800px",
          border: "none",
        }}
        allowFullScreen
      />
    </div>
  );
}
