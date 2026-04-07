"use client";

import { useState } from "react";
import Link from "next/link";
import { formatInCentral } from "@/lib/format-date";
import VACreateTicketForm from "../VACreateTicketForm";

type StaleRow = {
  member_id: string;
  last_ticket_at: string | null;
  last_ticket_id: string | null;
  preferred_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type MemberOption = { id: string; label: string; avatarUrl?: string | null };

type TaskLibraryItem = { task: string; credits: number };

const CHECKIN_SUBJECT = "Member check-in";
const CHECKIN_DESCRIPTION =
  "Reach out to see if there is anything we can help with this week. Offer a suggested recurring task if it fits.";

type Props = {
  staleRows: StaleRow[];
  members: MemberOption[];
  taskLibrary: TaskLibraryItem[];
  loadError: string | null;
};

function displayName(row: StaleRow): string {
  return (row.preferred_name || row.full_name || row.member_id.slice(0, 8)).trim();
}

export default function VAOutreachClient({ staleRows, members, taskLibrary, loadError }: Props) {
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  return (
    <>
      {loadError && (
        <p className="form-note" style={{ marginBottom: "var(--space-md)", color: "var(--color-error, #b91c1c)" }} role="alert">
          Could not load check-in list: {loadError}
        </p>
      )}

      {staleRows.length === 0 && !loadError ? (
        <p className="form-note">No members match the quiet-window criteria right now.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          {staleRows.map((row) => {
            const name = displayName(row);
            const expanded = expandedMemberId === row.member_id;
            return (
              <li key={row.member_id} className="card" style={{ padding: "var(--space-md)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--space-sm)" }}>
                  <div>
                    <strong>{name}</strong>
                    <p className="form-note" style={{ margin: "var(--space-2xs) 0 0 0" }}>
                      {row.last_ticket_at == null
                        ? "No tasks yet"
                        : `Last activity: ${formatInCentral(row.last_ticket_at)}`}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xs)", alignItems: "center" }}>
                    {row.last_ticket_id && (
                      <Link href={`/va/${row.last_ticket_id}`} className="btn btn-secondary" style={{ fontSize: "0.875rem" }}>
                        Open last ticket
                      </Link>
                    )}
                    <Link
                      href={`/va/outreach/member/${row.member_id}`}
                      className="btn btn-secondary"
                      style={{ fontSize: "0.875rem" }}
                    >
                      View profile
                    </Link>
                    <button
                      type="button"
                      className={expanded ? "btn btn-primary" : "btn btn-secondary"}
                      style={{ fontSize: "0.875rem" }}
                      onClick={() => setExpandedMemberId((id) => (id === row.member_id ? null : row.member_id))}
                      aria-expanded={expanded}
                    >
                      {expanded ? "Hide form" : "Start check-in task"}
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div style={{ marginTop: "var(--space-md)", paddingTop: "var(--space-md)", borderTop: "1px solid var(--color-border, #e5e5e5)" }}>
                    <VACreateTicketForm
                      key={row.member_id}
                      members={members}
                      taskLibrary={taskLibrary}
                      defaultMemberId={row.member_id}
                      lockMember
                      initialSubject={CHECKIN_SUBJECT}
                      initialDescription={CHECKIN_DESCRIPTION}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
