"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TaskLibraryItem } from "@/lib/task-library";
import { createRecurringTask, type RecurringTaskForm as RecurringTaskFormType } from "../actions";

const DAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const MAX_RECURRING = 10;

type Props = {
  taskLibrary: TaskLibraryItem[];
  existingCount?: number;
};

export default function RecurringTaskForm({ taskLibrary, existingCount = 0 }: Props) {
  const router = useRouter();
  const [source, setSource] = useState<"library" | "custom">("library");
  const [taskLibraryId, setTaskLibraryId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [descriptionTemplate, setDescriptionTemplate] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(6); // Saturday
  const [contextNotes, setContextNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedLibraryTask = taskLibraryId ? taskLibrary.find((t) => t.id === taskLibraryId) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (existingCount >= MAX_RECURRING) {
      setError(`You can have up to ${MAX_RECURRING} recurring tasks.`);
      return;
    }
    const form: RecurringTaskFormType = {
      task_library_id: source === "library" && taskLibraryId ? taskLibraryId : null,
      subject: source === "custom" ? subject.trim() || null : null,
      description_template: source === "custom" ? descriptionTemplate.trim() || null : null,
      schedule_type: "weekly",
      day_of_week: dayOfWeek,
      context_notes: contextNotes.trim() || null,
      credit_cost: null,
    };
    if (source === "library" && !form.task_library_id) {
      setError("Choose a task from the library.");
      return;
    }
    if (source === "custom" && !form.subject) {
      setError("Enter a task subject.");
      return;
    }
    setSubmitting(true);
    const result = await createRecurringTask(form);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setTaskLibraryId("");
    setSubject("");
    setDescriptionTemplate("");
    setContextNotes("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <p role="alert" style={{ color: "var(--color-error, #b91c1c)", marginBottom: "var(--space-md)" }}>
          {error}
        </p>
      )}

      <div style={{ marginBottom: "var(--space-md)" }}>
        <label className="form-label">Task source</label>
        <div style={{ display: "flex", gap: "var(--space-lg)", marginTop: "var(--space-xs)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
            <input
              type="radio"
              name="source"
              checked={source === "library"}
              onChange={() => setSource("library")}
            />
            From task library
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
            <input
              type="radio"
              name="source"
              checked={source === "custom"}
              onChange={() => setSource("custom")}
            />
            Custom task
          </label>
        </div>
      </div>

      {source === "library" && (
        <div style={{ marginBottom: "var(--space-md)" }}>
          <label htmlFor="task-library" className="form-label">
            Task
          </label>
          <select
            id="task-library"
            className="input"
            value={taskLibraryId}
            onChange={(e) => setTaskLibraryId(e.target.value)}
            required={source === "library"}
          >
            <option value="">Select a task…</option>
            {taskLibrary.map((t) => (
              <option key={t.id} value={t.id}>
                {t.task} ({t.credits} credits)
              </option>
            ))}
          </select>
          {selectedLibraryTask && (
            <p className="form-note" style={{ marginTop: "var(--space-xs)" }}>
              Template will be filled with your profile (diet, household, etc.). Add any extra context below.
            </p>
          )}
        </div>
      )}

      {source === "custom" && (
        <>
          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="subject" className="form-label">
              Task subject
            </label>
            <input
              id="subject"
              type="text"
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Weekly meal plan"
              required={source === "custom"}
            />
          </div>
          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="description" className="form-label">
              Description (optional)
            </label>
            <textarea
              id="description"
              className="input"
              rows={3}
              value={descriptionTemplate}
              onChange={(e) => setDescriptionTemplate(e.target.value)}
              placeholder="Any instructions for your VA…"
            />
          </div>
        </>
      )}

      <div style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="day" className="form-label">
          Repeat every
        </label>
        <select
          id="day"
          className="input"
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
          style={{ maxWidth: 200 }}
        >
          {DAY_OPTIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <p className="form-note" style={{ marginTop: "var(--space-xs)" }}>
          A new task will be created automatically on this day each week (in your timezone).
        </p>
      </div>

      <div style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="context" className="form-label">
          Context for your VA (optional)
        </label>
        <textarea
          id="context"
          className="input"
          rows={3}
          value={contextNotes}
          onChange={(e) => setContextNotes(e.target.value)}
          placeholder="e.g. Include Publix weekly sales; I shop there on Sunday."
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Saving…" : "Add recurring task"}
      </button>
    </form>
  );
}
