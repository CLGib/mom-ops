"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TaskLibraryItem } from "@/lib/task-library";

type Props = {
  tasks: TaskLibraryItem[];
  categories: string[];
  mode: "member" | "va" | "guest";
  /** When true, show task list only when user has entered search or selected a category (no full list by default). */
  showOnlyWhenFiltered?: boolean;
};

export default function ExploreTasksLibrary({ tasks, categories, mode, showOnlyWhenFiltered = false }: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const filtered = useMemo(() => {
    let list = [...tasks];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.task.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      list = list.filter((t) => t.category === categoryFilter);
    }
    list.sort((a, b) => {
      const rankA = a.rank ?? 999;
      const rankB = b.rank ?? 999;
      if (rankA !== rankB) return rankA - rankB;
      const cat = a.category.localeCompare(b.category);
      if (cat !== 0) return cat;
      return a.task.localeCompare(b.task);
    });
    return list;
  }, [tasks, search, categoryFilter]);

  const hasActiveFilter = search.trim() !== "" || categoryFilter !== "";
  const showList = !showOnlyWhenFiltered || hasActiveFilter;

  return (
    <div style={{ maxWidth: 720 }}>
      <form
        onSubmit={(e) => e.preventDefault()}
        style={{ marginBottom: "var(--space-lg)" }}
        role="search"
        aria-label="Filter task library"
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-md)",
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="explore-search" className="form-note" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
              Search
            </label>
            <input
              id="explore-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="input"
              style={{ width: "100%", boxSizing: "border-box" }}
              autoComplete="off"
            />
          </div>
          <div style={{ minWidth: 200 }}>
            <label htmlFor="explore-category" className="form-note" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
              Category
            </label>
            <select
              id="explore-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input"
              style={{ width: "100%", boxSizing: "border-box" }}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>

      {showList ? (
        <>
          <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
            {filtered.length} task{filtered.length !== 1 ? "s" : ""} found
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {filtered.map((t) => (
            <li
              key={t.id}
              style={{
                padding: "var(--space-md)",
                marginBottom: "var(--space-sm)",
                border: "1px solid var(--color-border, #e5e5e5)",
                borderRadius: "var(--radius, 6px)",
                backgroundColor: "var(--color-bg, #fff)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-md)", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted, #5c5955)",
                      display: "block",
                      marginBottom: "var(--space-2xs)",
                    }}
                  >
                    {t.category}
                  </span>
                  <strong style={{ fontSize: "1rem" }}>{t.task}</strong>
                  <span
                    style={{
                      marginLeft: "var(--space-sm)",
                      fontSize: "0.875rem",
                      color: "var(--accent, #b8860b)",
                      fontWeight: 600,
                    }}
                  >
                    ~{t.credits} credit{t.credits !== 1 ? "s" : ""}
                  </span>
                </div>
                {mode === "member" && (
                  <Link
                    href={`/member?from_task=${t.id}#submit`}
                    className="btn btn-primary"
                    style={{ flexShrink: 0 }}
                  >
                    Create task
                  </Link>
                )}
              </div>
            </li>
          ))}
          </ul>

          {filtered.length === 0 && (
            <p className="form-note" style={{ marginTop: "var(--space-lg)" }}>
              No tasks match your search. Try a different term or category.
            </p>
          )}
        </>
      ) : (
        <p className="form-note" style={{ marginTop: "var(--space-md)" }}>
          Enter a search or choose a category to see tasks.
        </p>
      )}
    </div>
  );
}
