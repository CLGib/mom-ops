/**
 * Standalone sync task library for static/marketing pages (e.g. /founders).
 * No Supabase or server deps — only JSON. Use this so the founders page never
 * pulls in env-dependent code that can 500 in production.
 */

import taskLibraryJson from "@/data/task-library.json";

export type TaskLibraryItem = {
  id: string;
  category: string;
  task: string;
  credits: number;
  template: string;
  rank: number;
};

type JsonTask = { category: string; task: string; credits: number; template: string; rank?: number };

function safeParse(): TaskLibraryItem[] {
  try {
    const arr = taskLibraryJson as JsonTask[];
    if (!Array.isArray(arr)) return [];
    return arr.map((t, i) => ({
      id: `json-${i}`,
      category: t.category ?? "",
      task: t.task ?? "",
      credits: t.credits ?? 0,
      template: t.template ?? "",
      rank: t.rank ?? 500,
    }));
  } catch (e) {
    console.error("[task-library-static] parse failed:", e);
    return [];
  }
}

export function getTaskLibrarySync(): TaskLibraryItem[] {
  try {
    return safeParse();
  } catch (e) {
    console.error("[task-library-static] getTaskLibrarySync failed:", e);
    return [];
  }
}

export function getCategoriesSync(): string[] {
  try {
    const tasks = getTaskLibrarySync();
    const set = new Set(tasks.map((t) => t.category));
    return Array.from(set).sort();
  } catch (e) {
    console.error("[task-library-static] getCategoriesSync failed:", e);
    return [];
  }
}
