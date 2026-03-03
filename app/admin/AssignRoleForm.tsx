"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UserRow = { id: string; role: string; email: string };

const ROLES = [
  { value: "member", label: "Member" },
  { value: "va", label: "VA" },
  { value: "director", label: "CXO" },
  { value: "cfo", label: "CFO" },
  { value: "admin", label: "CEO" },
] as const;

function normalizeRole(role: string): string {
  const r = (role ?? "").toLowerCase();
  return ROLES.some((o) => o.value === r) ? r : "member";
}

export default function AssignRoleForm({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [optimisticRoles, setOptimisticRoles] = useState<Record<string, string>>({});

  const roleFor = (u: UserRow) =>
    optimisticRoles[u.id] ?? normalizeRole(u.role);

  async function handleChange(userId: string, newRole: string) {
    const role = newRole.toLowerCase();
    if (!["member", "va", "admin", "director", "cfo"].includes(role)) return;
    setError(null);
    setOptimisticRoles((prev) => ({ ...prev, [userId]: role }));
    setUpdating(userId);
    try {
      const res = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to update role");
        setOptimisticRoles((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
        return;
      }
      router.refresh();
    } finally {
      setUpdating(null);
    }
  }

  return (
    <>
      {error && (
        <p className="form-note" style={{ color: "var(--color-error, #b91c1c)", marginBottom: "var(--space-sm)" }} role="alert">
          {error}
        </p>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
            <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Email</th>
            <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
              <td style={{ padding: "var(--space-sm)" }}>{u.email}</td>
              <td style={{ padding: "var(--space-sm)" }}>
                <select
                  value={roleFor(u)}
                  onChange={(e) => handleChange(u.id, e.target.value)}
                  disabled={updating === u.id}
                  className="input"
                  style={{
                    width: "auto",
                    minWidth: "9rem",
                    cursor: "pointer",
                    paddingRight: "1.75rem",
                  }}
                  aria-label={`Role for ${u.email}`}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {updating === u.id && (
                  <span className="form-note" style={{ marginLeft: "var(--space-sm)" }}>Saving…</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && <p className="form-note">No users found.</p>}
    </>
  );
}
