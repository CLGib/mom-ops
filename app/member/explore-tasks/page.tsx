import { getTaskLibrary, getCategories } from "@/lib/task-library";
import ExploreTasksLibrary from "../../components/ExploreTasksLibrary";

export const dynamic = "force-dynamic";

export default async function MemberExploreTasksPage() {
  const [tasks, categories] = await Promise.all([getTaskLibrary(), getCategories()]);
  return (
    <main className="app-shell">
      <h1 className="page-title">Explore Tasks</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Browse task ideas and credit costs. Click &quot;Create task&quot; to start a new task with the subject and template pre-filled.
      </p>
      <ExploreTasksLibrary tasks={tasks} categories={categories} mode="member" />
    </main>
  );
}
