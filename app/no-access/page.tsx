export const metadata = {
  title: "Access pending - Mom Ops",
  description: "Your account does not have access yet. Contact support.",
};

export default function NoAccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="app-shell app-shell--narrow">
      <h1 className="page-title">Access pending</h1>
      <div className="card">
        <p className="section-body" style={{ marginBottom: "var(--space-md)" }}>
          Your account isn’t set up for access yet. This usually means your role hasn’t been assigned.
        </p>
        <p className="section-body" style={{ marginBottom: "var(--space-md)" }}>
          Please contact support so we can get you in.
        </p>
        <p style={{ marginBottom: 0 }}>
          <a href="/api/auth/signout" className="btn btn-secondary">
            Sign out
          </a>
        </p>
      </div>
    </div>
  );
}
