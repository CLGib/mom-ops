import { getTaskLibrary, getCategories } from "@/lib/task-library";
import PlaybookLibrary from "../../components/PlaybookLibrary";

export const dynamic = "force-dynamic";

export default async function MemberPlaybooksPage() {
  const [playbooks, categories] = await Promise.all([
    getTaskLibrary(),
    getCategories(),
  ]);

  return (
    <main className="app-shell">
      <h1 className="page-title">Playbooks</h1>
      <p
        className="form-note"
        style={{
          marginBottom: "var(--space-lg)",
          maxWidth: 640,
          fontSize: "1rem",
          lineHeight: 1.5,
        }}
      >
        Repeatable systems for the family work that comes up again and again.
        Search for what you need, or browse by category — then click{" "}
        <strong>Start playbook</strong> and we&apos;ll take it from there.
      </p>
      <PlaybookLibrary playbooks={playbooks} categories={categories} />
    </main>
  );
}
