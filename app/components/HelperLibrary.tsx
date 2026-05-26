"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TaskLibraryItem } from "@/lib/task-library";

type Props = {
  helpers: TaskLibraryItem[];
  categories: string[];
};

function helperName(taskName: string): string {
  // If the task name already ends in "Helper", leave it alone.
  if (/helper$/i.test(taskName.trim())) return taskName;
  return `${taskName} Helper`;
}

export default function HelperLibrary({ helpers, categories }: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const filtered = useMemo(() => {
    let list = [...helpers];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (h) =>
          h.task.toLowerCase().includes(q) ||
          h.category.toLowerCase().includes(q),
      );
    }
    if (categoryFilter) {
      list = list.filter((h) => h.category === categoryFilter);
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
  }, [helpers, search, categoryFilter]);

  return (
    <div>
      {/* Search + filter row */}
      <form
        onSubmit={(e) => e.preventDefault()}
        role="search"
        aria-label="Search helpers"
        style={{ marginBottom: "var(--space-xl)" }}
      >
        <label
          htmlFor="helper-search"
          className="form-note"
          style={{ display: "block", marginBottom: "var(--space-xs)" }}
        >
          Search
        </label>
        <input
          id="helper-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Try 'meal plan', 'birthday', 'summer camp'..."
          className="input"
          style={{
            width: "100%",
            padding: "var(--space-md) var(--space-lg)",
            fontSize: "1.0625rem",
            boxSizing: "border-box",
          }}
          autoComplete="off"
          autoFocus
        />
        <div
          style={{
            marginTop: "var(--space-md)",
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-sm)",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="helper-category"
            className="form-note"
            style={{ margin: 0 }}
          >
            Category:
          </label>
          <select
            id="helper-category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input"
            style={{ minWidth: 220, padding: "var(--space-sm) var(--space-md)" }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p
            className="form-note"
            style={{ marginLeft: "auto", marginBottom: 0 }}
          >
            {filtered.length} helper{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
      </form>

      {/* Helper card grid */}
      {filtered.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: "var(--space-md)",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          {filtered.map((h) => (
            <article
              key={h.id}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-sm)",
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--accent, #b8860b)",
                  fontWeight: 600,
                }}
              >
                {h.category}
              </span>
              <h3
                style={{
                  fontSize: "1.0625rem",
                  margin: 0,
                  fontWeight: 600,
                  lineHeight: 1.3,
                  flex: 1,
                }}
              >
                {helperName(h.task)}
              </h3>
              <Link
                href={`/member?from_task=${h.id}#submit`}
                className="btn btn-primary"
                style={{
                  marginTop: "var(--space-xs)",
                  textAlign: "center",
                  display: "inline-block",
                }}
              >
                Bring this helper in
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p
          className="form-note"
          style={{ marginTop: "var(--space-lg)", textAlign: "center" }}
        >
          No helpers match your search. Try a different term or category.
        </p>
      )}
    </div>
  );
}
