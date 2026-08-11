"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TaskLibraryItem } from "@/lib/task-library";
import { bringInHelper } from "../member/helpers/actions";

type Props = {
  helpers: TaskLibraryItem[];
  categories: string[];
  /** Optional "Suggested for you" row rendered above the search. */
  suggestedHelpers?: TaskLibraryItem[];
};

function helperName(taskName: string): string {
  if (/helper$/i.test(taskName.trim())) return taskName;
  return `${taskName} Helper`;
}

export default function HelperLibrary({
  helpers,
  categories,
  suggestedHelpers,
}: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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

  function handleBringIn(helperId: string) {
    setError(null);
    setPendingId(helperId);
    startTransition(async () => {
      const result = await bringInHelper(helperId);
      if (result.error || !result.ticketId) {
        setError(result.error ?? "Something went wrong. Please try again.");
        setPendingId(null);
        return;
      }
      router.push(`/member/helpers/${result.ticketId}/sent`);
    });
  }

  return (
    <div>
      {error && (
        <div
          role="alert"
          style={{
            marginBottom: "var(--space-md)",
            padding: "var(--space-sm) var(--space-md)",
            background: "var(--color-error-bg, #fef2f2)",
            color: "var(--color-error, #b91c1c)",
            borderRadius: "var(--radius, 6px)",
            borderLeft: "3px solid var(--color-error, #b91c1c)",
            fontSize: "0.9375rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Suggested for you — small row above the search */}
      {suggestedHelpers && suggestedHelpers.length > 0 && (
        <section
          aria-label="Suggested for you"
          style={{ marginBottom: "var(--space-xl)" }}
        >
          <p
            className="form-note"
            style={{
              marginBottom: "var(--space-sm)",
              fontSize: "0.8125rem",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            Suggested for you
          </p>
          <div
            style={{
              display: "grid",
              gap: "var(--space-sm)",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            }}
          >
            {suggestedHelpers.map((h) => {
              const busy = pendingId === h.id && isPending;
              return (
                <article
                  key={`sug-${h.id}`}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-xs)",
                    padding: "var(--space-md)",
                    background: "var(--accent-soft-bg, #f8f5ed)",
                    border: "1px solid var(--color-border, #e5e5e5)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.6875rem",
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
                      fontSize: "1rem",
                      margin: 0,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      flex: 1,
                    }}
                  >
                    {helperName(h.task)}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleBringIn(h.id)}
                    disabled={busy || isPending}
                    className="btn btn-primary"
                    style={{
                      marginTop: "var(--space-xs)",
                      width: "100%",
                      opacity: busy || isPending ? 0.7 : 1,
                      cursor: busy || isPending ? "wait" : "pointer",
                    }}
                  >
                    {busy ? "Bringing in…" : "Bring this helper in"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

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
          {filtered.map((h) => {
            const busy = pendingId === h.id && isPending;
            return (
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
                <button
                  type="button"
                  onClick={() => handleBringIn(h.id)}
                  disabled={busy || isPending}
                  className="btn btn-primary"
                  style={{
                    marginTop: "var(--space-xs)",
                    textAlign: "center",
                    opacity: busy || isPending ? 0.7 : 1,
                    cursor: busy || isPending ? "wait" : "pointer",
                  }}
                >
                  {busy ? "Bringing in…" : "Bring this helper in"}
                </button>
              </article>
            );
          })}
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
