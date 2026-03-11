"use client";

import { useMemo, useState } from "react";
import type { TaskLibraryItem } from "@/lib/task-library";

type Props = {
  initialTasks: TaskLibraryItem[];
};

export default function AdminTaskLibraryManager({ initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [category, setCategory] = useState("");
  const [task, setTask] = useState("");
  const [credits, setCredits] = useState("0");
  const [template, setTemplate] = useState("");
  const [rank, setRank] = useState("500");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editTask, setEditTask] = useState("");
  const [editTemplate, setEditTemplate] = useState("");
  const [editCredits, setEditCredits] = useState("");
  const [editRank, setEditRank] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addingToLibraryId, setAddingToLibraryId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set(tasks.map((t) => t.category).filter(Boolean));
    return Array.from(set).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
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

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      const res = await fetch("/api/admin/task-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category: category.trim(),
          task: task.trim(),
          credits: parseInt(credits, 10) || 0,
          template: template.trim(),
          rank: parseInt(rank, 10) || 500,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to add task.");
        setAdding(false);
        return;
      }
      setTasks((prev) => [...prev, data].sort((a, b) => (a.rank ?? 500) - (b.rank ?? 500)));
      setCategory("");
      setTask("");
      setCredits("0");
      setTemplate("");
      setRank("500");
    } catch {
      setError("Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/task-library/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to delete.");
        setDeletingId(null);
        return;
      }
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError("Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAddToLibrary(t: TaskLibraryItem) {
    if (!t.id.startsWith("json-")) return;
    setAddingToLibraryId(t.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/task-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category: t.category,
          task: t.task,
          credits: t.credits ?? 0,
          template: t.template ?? "",
          rank: t.rank ?? 500,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to add to library.");
        setAddingToLibraryId(null);
        return;
      }
      setTasks((prev) =>
        prev.map((item) => (item.id === t.id ? { ...data } : item)).sort((a, b) => (a.rank ?? 500) - (b.rank ?? 500))
      );
    } catch {
      setError("Something went wrong.");
    } finally {
      setAddingToLibraryId(null);
    }
  }

  function startEditing(t: TaskLibraryItem) {
    if (t.id.startsWith("json-")) return;
    setEditingId(t.id);
    setEditCategory(t.category);
    setEditTask(t.task);
    setEditTemplate(t.template ?? "");
    setEditCredits(String(t.credits));
    setEditRank(String(t.rank ?? 500));
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditCategory("");
    setEditTask("");
    setEditTemplate("");
    setEditCredits("");
    setEditRank("");
  }

  async function handleUpdate(id: string) {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/task-library/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category: editCategory.trim(),
          task: editTask.trim(),
          template: editTemplate,
          credits: parseInt(editCredits, 10) || 0,
          rank: parseInt(editRank, 10) ?? 500,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to update.");
        setSavingId(null);
        return;
      }
      setTasks((prev) =>
        prev
          .map((item) =>
            item.id === id
              ? {
                  ...item,
                  category: data.category ?? item.category,
                  task: data.task ?? item.task,
                  template: data.template ?? item.template,
                  credits: data.credits ?? item.credits,
                  rank: data.rank ?? item.rank,
                }
              : item
          )
          .sort((a, b) => (a.rank ?? 500) - (b.rank ?? 500))
      );
      cancelEditing();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <section className="card" style={{ marginBottom: "var(--space-xl)" }}>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-md)" }}>
          Add task
        </h2>
        <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          {error && (
            <p role="alert" className="form-note" style={{ color: "var(--color-error, #c00)" }}>
              {error}
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)" }}>
            <div className="form-group" style={{ flex: "1 1 12rem" }}>
              <label htmlFor="add-category">Category</label>
              <input
                id="add-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="input"
                placeholder="e.g. Daily Life & Household"
              />
            </div>
            <div className="form-group" style={{ flex: "1 1 12rem" }}>
              <label htmlFor="add-task">Task name</label>
              <input
                id="add-task"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                required
                className="input"
                placeholder="e.g. Grocery order build"
              />
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)" }}>
            <div className="form-group" style={{ width: "6rem" }}>
              <label htmlFor="add-credits">Credits</label>
              <input
                id="add-credits"
                type="number"
                min="0"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                className="input"
              />
            </div>
            <div className="form-group" style={{ width: "6rem" }}>
              <label htmlFor="add-rank">Rank</label>
              <input
                id="add-rank"
                type="number"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="input"
                placeholder="500"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="add-template">Member template (optional)</label>
            <textarea
              id="add-template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="input"
              rows={4}
              placeholder="Please provide the following details:&#10;&#10;Field 1:&#10;Field 2:"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={adding}>
            {adding ? "Adding…" : "Add task"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-md)" }}>
          All tasks ({filteredTasks.length}{filteredTasks.length !== tasks.length ? ` of ${tasks.length}` : ""})
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="admin-task-search" className="form-note" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
              Search
            </label>
            <input
              id="admin-task-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by task name or category..."
              className="input"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ minWidth: 200 }}>
            <label htmlFor="admin-task-category" className="form-note" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
              Category
            </label>
            <select
              id="admin-task-category"
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
        {filteredTasks.length === 0 ? (
          <p className="form-note">
            {search.trim() || categoryFilter ? "No tasks match your search or category. Try different filters." : "No tasks in the library yet. Add one above."}
          </p>
        ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {filteredTasks.map((t) => (
            <li
              key={t.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "var(--space-md)",
                padding: "var(--space-md)",
                marginBottom: "var(--space-sm)",
                border: "1px solid var(--color-border, #e5e5e5)",
                borderRadius: "var(--radius, 6px)",
                backgroundColor: "var(--color-bg, #fff)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingId === t.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", marginTop: "var(--space-sm)" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)" }}>
                      <div className="form-group" style={{ flex: "1 1 10rem" }}>
                        <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>Category</label>
                        <input
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="input"
                          placeholder="Category"
                          style={{ width: "100%", boxSizing: "border-box" }}
                        />
                      </div>
                      <div className="form-group" style={{ flex: "1 1 10rem" }}>
                        <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>Task name</label>
                        <input
                          value={editTask}
                          onChange={(e) => setEditTask(e.target.value)}
                          className="input"
                          placeholder="Task name"
                          style={{ width: "100%", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)" }}>
                      <div className="form-group" style={{ width: "6rem" }}>
                        <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>Credits</label>
                        <input
                          type="number"
                          min={0}
                          value={editCredits}
                          onChange={(e) => setEditCredits(e.target.value)}
                          className="input"
                          style={{ width: "100%", boxSizing: "border-box" }}
                        />
                      </div>
                      <div className="form-group" style={{ width: "6rem" }}>
                        <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>Rank</label>
                        <input
                          type="number"
                          min={0}
                          value={editRank}
                          onChange={(e) => setEditRank(e.target.value)}
                          className="input"
                          style={{ width: "100%", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>Member template (optional)</label>
                      <textarea
                        value={editTemplate}
                        onChange={(e) => setEditTemplate(e.target.value)}
                        className="input"
                        rows={3}
                        placeholder="Template instructions..."
                        style={{ width: "100%", boxSizing: "border-box" }}
                      />
                    </div>
                    {error && (
                      <p role="alert" className="form-note" style={{ color: "var(--color-error, #c00)", margin: 0 }}>
                        {error}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted, #5c5955)" }}>
                  {t.category}
                </span>
                <div style={{ fontWeight: 600, marginTop: "var(--space-2xs)" }}>{t.task}</div>
                  <span style={{ fontSize: "0.875rem", color: "var(--accent, #b8860b)", fontWeight: 600, display: "block", marginTop: "var(--space-2xs)" }}>
                    ~{t.credits} credit{t.credits !== 1 ? "s" : ""}
                    {typeof t.rank === "number" && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted, #5c5955)", fontWeight: 500, marginLeft: "var(--space-sm)" }}>
                        · rank {t.rank}
                      </span>
                    )}
                  </span>
                  </>
                )}
              </div>
              <div style={{ display: "flex", gap: "var(--space-xs)", flexShrink: 0 }}>
                {editingId === t.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleUpdate(t.id)}
                      disabled={savingId === t.id}
                      className="btn btn-primary"
                    >
                      {savingId === t.id ? "Saving…" : "Save"}
                    </button>
                    <button type="button" onClick={cancelEditing} className="btn btn-secondary" disabled={savingId === t.id}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {t.id.startsWith("json-") ? (
                      <button
                        type="button"
                        onClick={() => handleAddToLibrary(t)}
                        disabled={addingToLibraryId === t.id}
                        className="btn btn-primary"
                      >
                        {addingToLibraryId === t.id ? "Adding…" : "Add to library"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditing(t)}
                        className="btn btn-secondary"
                      >
                        Edit
                      </button>
                    )}
                    {!t.id.startsWith("json-") && (
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="btn btn-secondary"
                        style={{ color: "var(--color-error, #c00)" }}
                      >
                        {deletingId === t.id ? "Deleting…" : "Delete"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        )}
      </section>
    </div>
  );
}
