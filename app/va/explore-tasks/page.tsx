import { getTaskLibrary, getCategories } from "@/lib/task-library";
import ExploreTasksLibrary from "../../components/ExploreTasksLibrary";

export const dynamic = "force-dynamic";

export default async function VAExploreTasksPage() {
  const [tasks, categories] = await Promise.all([getTaskLibrary(), getCategories()]);
  return (
    <main className="app-shell">
      <h1 className="page-title">Explore Tasks</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Reference task ideas and credit costs when assigning costs to your tasks.
      </p>
      <ExploreTasksLibrary tasks={tasks} categories={categories} mode="va" />
    </main>
  );
}
