/**
 * Build subject, description, and credit_cost for a ticket from a recurring task.
 * Used by the create-recurring-tasks cron job.
 */

import { fillTaskTemplate } from "./fill-task-template";
import type { ProfileForTemplate } from "./fill-task-template";

/** Minimal task library shape used when building a ticket from a recurring task. */
export type TaskLibraryTaskShape = {
  task: string;
  template: string;
  credits: number;
};

export type RecurringTaskRow = {
  id: string;
  member_id: string;
  task_library_id: string | null;
  subject: string | null;
  description_template: string | null;
  context_notes: string | null;
  credit_cost: number | null;
};

/**
 * Returns subject, description, and credit_cost for inserting a ticket.
 */
export function buildTicketFromRecurringTask(
  recurring: RecurringTaskRow,
  libraryTask: TaskLibraryTaskShape | null,
  profile: ProfileForTemplate | null
): { subject: string; description: string; credit_cost: number } {
  let subject: string;
  let template: string;
  let credit_cost: number;

  if (recurring.task_library_id && libraryTask) {
    subject = libraryTask.task;
    template = libraryTask.template;
    credit_cost = recurring.credit_cost ?? libraryTask.credits ?? 0;
  } else {
    subject = (recurring.subject ?? "").trim() || "Recurring task";
    template = (recurring.description_template ?? "").trim();
    credit_cost = recurring.credit_cost ?? 0;
  }

  let description = fillTaskTemplate(template, profile) || template;
  if ((recurring.context_notes ?? "").trim()) {
    description = description.trimEnd();
    if (description) description += "\n\n";
    description += "Additional context: " + (recurring.context_notes ?? "").trim();
  }

  return { subject, description, credit_cost: Math.max(0, credit_cost) };
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Get day of week (0–6, Sunday=0) for a date in the given IANA timezone. */
export function getDayOfWeekInTz(ts: Date, tz: string): number {
  const dayName = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" }).format(ts);
  const i = DAY_NAMES.indexOf(dayName);
  return i >= 0 ? i : 0;
}

/** Get week key (Sunday date YYYY-MM-DD) in the given timezone for idempotency. */
export function getWeekKeyInTz(ts: Date, tz: string): string {
  const dateStr = new Date(ts).toLocaleDateString("en-CA", { timeZone: tz });
  const dayOfWeek = getDayOfWeekInTz(ts, tz);
  const d = new Date(dateStr + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() - dayOfWeek);
  return d.toISOString().slice(0, 10);
}
