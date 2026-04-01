"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteRecurringTask, setRecurringTaskActive } from "../actions";

export type RecurringTaskItem = {
  id: string;
  task_library_id: string | null;
  subject: string | null;
  description_template: string | null;
  schedule_type: string;
  day_of_week: number;
  day_label: string;
  context_notes: string | null;
  credit_cost: number | null;
  is_active: boolean;
  last_created_at: string | null;
  created_at: string;
  task_name: string;
};

export default function RecurringTaskList({ items }: { items: RecurringTaskItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    const { error } = await deleteRecurringTask(id);
    setDeletingId(null);
    if (error) alert(error);
    else router.refresh();
  }

  async function handleToggleActive(id: string, currentlyActive: boolean) {
    if (togglingId) return;
    setTogglingId(id);
    const { error } = await setRecurringTaskActive(id, !currentlyActive);
    setTogglingId(null);
    if (error) alert(error);
    else router.refresh();
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {items.map((item) => (
        <li
          key={item.id}
          style={{
            padding: "var(--space-md)",
            marginBottom: "var(--space-sm)",
            border: "1px solid var(--color-border, #e5e5e5)",
            borderRadius: "var(--radius, 6px)",
            backgroundColor: item.is_active ? "var(--color-bg, #fff)" : "var(--color-muted-bg, #f5f5f5)",
            opacity: item.is_active ? 1 : 0.85,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-md)", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: "1rem" }}>{item.task_name}</strong>
              <span style={{ marginLeft: "var(--space-sm)", fontSize: "0.875rem", color: "var(--text-muted, #5c5955)" }}>
                Every {item.day_label}
              </span>
              {item.context_notes && (
                <p className="form-note" style={{ marginTop: "var(--space-xs)", marginBottom: 0, fontSize: "0.875rem" }}>
                  {item.context_notes.slice(0, 120)}
                  {item.context_notes.length > 120 ? "…" : ""}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: "0.875rem" }}
                disabled={!!togglingId}
                onClick={() => handleToggleActive(item.id, item.is_active)}
              >
                {togglingId === item.id ? "…" : item.is_active ? "Pause" : "Resume"}
              </button>
              <button
                type="button"
                className="btn"
                style={{ fontSize: "0.875rem", color: "var(--color-error, #b91c1c)" }}
                disabled={!!deletingId}
                onClick={() => (confirm("Remove this recurring task?") ? handleDelete(item.id) : null)}
              >
                {deletingId === item.id ? "…" : "Remove"}
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
