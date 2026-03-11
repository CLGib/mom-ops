import type { TaskLibraryItem } from "@/lib/task-library";
import type { ProfileForTemplate } from "@/lib/fill-task-template";
import { countFillableTemplateLines } from "@/lib/fill-task-template";

export type PastTicketForSuggestions = {
  category?: string | null;
  subject?: string | null;
};

const WEIGHT_PAST = 1;
const WEIGHT_PROFILE = 1;
const DEFAULT_LIMIT = 8;

/** Normalize for keyword match: lowercase, split on non-alphanumeric, drop short tokens */
function tokenize(text: string): Set<string> {
  if (!text?.trim()) return new Set();
  const tokens = text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
  return new Set(tokens);
}

/** Score from past tickets: category match + keyword overlap with task name and subjects */
function pastBehaviorScore(
  task: TaskLibraryItem,
  pastTickets: PastTicketForSuggestions[]
): number {
  let score = 0;
  const taskTokens = tokenize(task.task);
  const taskCategory = (task.category ?? "").trim().toLowerCase();

  for (const t of pastTickets) {
    const cat = (t.category ?? "").trim().toLowerCase();
    if (cat && taskCategory === cat) score += 1;
    const subj = (t.subject ?? "").trim();
    if (subj) {
      const subjectTokens = tokenize(subj);
      for (const tok of taskTokens) {
        if (subjectTokens.has(tok)) score += 0.5;
      }
    }
  }
  return score;
}

/** Score from profile: how many template placeholders the profile can fill */
function profileFitScore(
  task: TaskLibraryItem,
  profile: ProfileForTemplate | null
): number {
  if (!profile) return 0;
  return countFillableTemplateLines(task.template ?? "", profile);
}

/** Score task by keyword overlap with a subject string (for similar-tasks-by-subject). */
function subjectOverlapScore(task: TaskLibraryItem, subject: string): number {
  const subjectTokens = tokenize(subject);
  if (!subjectTokens.size) return 0;
  const taskTokens = tokenize(task.task);
  const categoryTokens = tokenize(task.category ?? "");
  let score = 0;
  for (const tok of subjectTokens) {
    if (taskTokens.has(tok)) score += 1;
    if (categoryTokens.has(tok)) score += 0.5;
  }
  return score;
}

const SIMILAR_DEFAULT_LIMIT = 6;
const SIMILAR_TICKETS_LIMIT = 8;
const WEIGHT_GET_STARTED_RANK = 0.5;

/** Score for ticket similarity: keyword overlap between two subject strings */
function subjectSubjectScore(ticketSubject: string, querySubject: string): number {
  const queryTokens = tokenize(querySubject);
  if (!queryTokens.size) return 0;
  const ticketTokens = tokenize(ticketSubject);
  let score = 0;
  for (const tok of queryTokens) {
    if (ticketTokens.has(tok)) score += 1;
  }
  return score;
}

/**
 * Return tickets most similar to the given subject (for VA: see other tickets to answer quickly).
 * Excludes currentTicketId. Sorted by subject keyword overlap.
 */
export function getSimilarTicketsBySubject<
  T extends { id: string; subject?: string | null }
>(
  currentTicketId: string,
  subject: string,
  tickets: T[],
  options?: { limit?: number }
): T[] {
  const limit = options?.limit ?? SIMILAR_TICKETS_LIMIT;
  const subj = (subject ?? "").trim();
  if (!subj) return [];

  const scored = tickets
    .filter((t) => t.id !== currentTicketId && (t.subject ?? "").trim().length > 0)
    .map((t) => ({
      item: t,
      score: subjectSubjectScore((t.subject ?? "").trim(), subj),
    }))
    .filter((s) => s.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}

/**
 * Return task library items most similar to the given subject (keyword overlap with task name and category).
 * Sorted by score then rank, category, task name.
 */
export function getSimilarTasksBySubject(
  subject: string,
  allTasks: TaskLibraryItem[],
  options?: { limit?: number }
): TaskLibraryItem[] {
  const limit = options?.limit ?? SIMILAR_DEFAULT_LIMIT;
  if (!subject?.trim() || !allTasks.length) return [];

  const scored = allTasks.map((task) => ({
    task,
    score: subjectOverlapScore(task, subject),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const rankA = a.task.rank ?? 999;
    const rankB = b.task.rank ?? 999;
    if (rankA !== rankB) return rankA - rankB;
    const cat = a.task.category.localeCompare(b.task.category);
    if (cat !== 0) return cat;
    return a.task.task.localeCompare(b.task.task);
  });

  return scored.slice(0, limit).map((s) => s.task);
}

/**
 * Return task library items ranked by past behavior (categories + subject keywords)
 * and profile/template fit. When pastTickets is empty, favors tasks by rank (get-started / popular).
 */
export function getSuggestedTasks(
  profile: ProfileForTemplate | null,
  pastTickets: PastTicketForSuggestions[],
  allTasks: TaskLibraryItem[],
  options?: { limit?: number }
): TaskLibraryItem[] {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  if (!allTasks.length) return [];

  const noHistory = pastTickets.length === 0;

  const scored = allTasks.map((task) => {
    const past = pastBehaviorScore(task, pastTickets);
    const prof = profileFitScore(task, profile);
    let combined = WEIGHT_PAST * past + WEIGHT_PROFILE * prof;
    if (noHistory) {
      const rank = task.rank ?? 999;
      combined += WEIGHT_GET_STARTED_RANK * Math.max(0, 100 - Math.min(rank, 100));
    }
    return { task, score: combined };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const rankA = a.task.rank ?? 999;
    const rankB = b.task.rank ?? 999;
    if (rankA !== rankB) return rankA - rankB;
    const cat = a.task.category.localeCompare(b.task.category);
    if (cat !== 0) return cat;
    return a.task.task.localeCompare(b.task.task);
  });

  return scored.slice(0, limit).map((s) => s.task);
}
