"use client";

import { useState } from "react";

type LookupResult = {
  found: boolean;
  email: string;
  message?: string;
  userId?: string;
  profileRole?: string | null;
  userRolesRole?: string | null;
  ticketCount?: number;
  inMemberList?: boolean;
  canAccessMemberArea?: boolean;
  canAccessVATasks?: boolean;
  vaProfile?: { onboardingComplete: boolean; trainingComplete: boolean } | null;
  issues?: string[];
};

export default function MemberByEmailLookup() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(
        `/api/admin/member-by-email?email=${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Lookup failed");
        return;
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        marginTop: "var(--space-md)",
        paddingTop: "var(--space-md)",
        borderTop: "1px solid var(--color-border, #e5e5e5)",
      }}
    >
      <h3 style={{ fontSize: "0.9rem", marginBottom: "var(--space-sm)" }}>
        Look up member by email (support)
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", alignItems: "center" }}>
        <input
          type="email"
          className="input"
          placeholder="e.g. member@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleLookup())}
          style={{ maxWidth: "20rem" }}
          aria-label="Member email"
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleLookup}
          disabled={loading || !email.trim()}
        >
          {loading ? "Looking up…" : "Look up"}
        </button>
      </div>
      {error && (
        <p className="form-note" style={{ color: "var(--color-error, #b91c1c)", marginTop: "var(--space-sm)" }}>
          {error}
        </p>
      )}
      {result && (
        <div
          style={{
            marginTop: "var(--space-md)",
            padding: "var(--space-md)",
            background: "var(--color-bg-muted, #f5f5f5)",
            borderRadius: "var(--radius, 6px)",
            fontSize: "0.875rem",
          }}
        >
          {!result.found ? (
            <p className="form-note" style={{ margin: 0 }}>{result.message}</p>
          ) : (
            <>
              <p style={{ margin: "0 0 var(--space-xs) 0", fontWeight: 600 }}>
                {result.email}
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                <li>User ID: <code style={{ fontSize: "0.8em" }}>{result.userId}</code></li>
                <li>Profile role: {result.profileRole ?? "—"}</li>
                <li>user_roles.role: {result.userRolesRole ?? "—"}</li>
                <li>Task count (as member): {result.ticketCount ?? 0}</li>
                <li>In members list: {result.inMemberList ? "Yes" : "No"}</li>
                <li>Can access /member: {result.canAccessMemberArea ? "Yes" : "No"}</li>
                <li>Can access /va/tasks: {result.canAccessVATasks ? "Yes" : "No"}</li>
                {result.vaProfile != null && (
                  <li>VA profile: onboarding {result.vaProfile.onboardingComplete ? "✓" : "incomplete"}, training {result.vaProfile.trainingComplete ? "✓" : "incomplete"}</li>
                )}
              </ul>
              {result.issues && result.issues.length > 0 && (
                <div style={{ marginTop: "var(--space-sm)" }}>
                  <strong>Possible issues:</strong>
                  <ul style={{ margin: "var(--space-xs) 0 0 1.25rem" }}>
                    {result.issues.map((issue, i) => (
                      <li key={i} style={{ color: "var(--color-error, #b91c1c)" }}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.found && result.userId && result.userRolesRole === "member" && (
                <div style={{ marginTop: "var(--space-md)" }}>
                  <SetRoleToVaButton userId={result.userId} email={result.email} onSuccess={() => setResult((r) => r ? { ...r, userRolesRole: "va", canAccessVATasks: true, issues: r.issues?.filter((i) => !i.includes("Role is 'member'")) } : null)} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SetRoleToVaButton({ userId, email, onSuccess }: { userId: string; email: string; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSetRole() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: "va" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to set role");
        return;
      }
      setDone(true);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  if (done) return <p className="form-note" style={{ color: "var(--color-success, #15803d)", margin: 0 }}>Role set to VA. They can now log in and go to /va/tasks to claim tasks.</p>;
  return (
    <div>
      <p className="form-note" style={{ marginBottom: "var(--space-xs)" }}>
        This user is currently a member. To let them access VA tasks and claim tasks:
      </p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleSetRole}
        disabled={loading}
      >
        {loading ? "Setting…" : "Set role to VA"}
      </button>
      {error && (
        <p className="form-note" style={{ color: "var(--color-error, #b91c1c)", marginTop: "var(--space-xs)" }}>{error}</p>
      )}
    </div>
  );
}
