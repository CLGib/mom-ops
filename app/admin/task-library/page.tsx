import { getTaskLibrary } from "@/lib/task-library";
import AdminTaskLibraryManager from "./AdminTaskLibraryManager";

export const dynamic = "force-dynamic";

export default async function AdminTaskLibraryPage() {
  const tasks = await getTaskLibrary();

  return (
    <>
      <h1 className="page-title">Task Library</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Manage the task library members see in Explore tasks. Add tasks, set credit cost, and delete as needed. Seed tasks must be added to the library first (use &quot;Add to library&quot;), then you can edit them.
      </p>
      <AdminTaskLibraryManager initialTasks={tasks} />
    </>
  );
}
