import tasks from "./task-library.json";

export type TaskLibraryItem = {
  category: string;
  task: string;
  credits: number;
  template: string;
  rank?: number;
};

export const taskLibrary = tasks as TaskLibraryItem[];

export function getTaskByIndex(index: number): TaskLibraryItem | null {
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= taskLibrary.length) return null;
  return taskLibrary[i] ?? null;
}

export function getCategories(): string[] {
  const set = new Set(taskLibrary.map((t) => t.category));
  return Array.from(set).sort();
}
