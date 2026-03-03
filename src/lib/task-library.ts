import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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

function jsonFallback(): TaskLibraryItem[] {
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
    console.error("[task-library] jsonFallback failed:", e);
    return [];
  }
}

/** Sync, no Supabase. Use for pages that must render without any async/env (e.g. /founders). */
export function getTaskLibrarySync(): TaskLibraryItem[] {
  try {
    return jsonFallback();
  } catch (e) {
    console.error("[task-library] getTaskLibrarySync failed:", e);
    return [];
  }
}

/** Sync, no Supabase. Use with getTaskLibrarySync for static-only pages. */
export function getCategoriesSync(): string[] {
  const tasks = getTaskLibrarySync();
  const set = new Set(tasks.map((t) => t.category));
  return Array.from(set).sort();
}

export async function getTaskLibrary(): Promise<TaskLibraryItem[]> {
  try {
    // Use service client (no cookies) so marketing pages like /founders can render without dynamic server usage
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("task_library")
      .select("id, category, task, credits, template, rank")
      .order("rank", { ascending: true })
      .order("category")
      .order("task");
    if (error || !data?.length) return jsonFallback();
    return (data ?? []).map((r) => ({
      id: r.id,
      category: r.category,
      task: r.task,
      credits: r.credits ?? 0,
      template: r.template ?? "",
      rank: r.rank ?? 500,
    }));
  } catch (e) {
    console.error("[task-library]", e);
    return jsonFallback();
  }
}

export async function getTaskById(id: string): Promise<TaskLibraryItem | null> {
  if (id.startsWith("json-")) {
    const idx = parseInt(id.slice(5), 10);
    const fallback = jsonFallback();
    return fallback[idx] ?? null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_library")
    .select("id, category, task, credits, template, rank")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    category: data.category,
    task: data.task,
    credits: data.credits ?? 0,
    template: data.template ?? "",
    rank: data.rank ?? 500,
  };
}

export async function getCategories(): Promise<string[]> {
  const tasks = await getTaskLibrary();
  const set = new Set(tasks.map((t) => t.category));
  return Array.from(set).sort();
}

/** Resolve from_task param: UUID or json-N fetches by id; number uses index (legacy). */
export async function getTaskByFromTaskParam(param: string): Promise<TaskLibraryItem | null> {
  if (!param?.trim()) return null;
  const trimmed = param.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(trimmed) || trimmed.startsWith("json-")) {
    return getTaskById(trimmed);
  }
  const idx = parseInt(trimmed, 10);
  if (!Number.isInteger(idx) || idx < 0) return null;
  const tasks = await getTaskLibrary();
  return tasks[idx] ?? null;
}
