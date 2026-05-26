import { getTaskLibrary, getCategories } from "@/lib/task-library";
import HelperLibrary from "../../components/HelperLibrary";

export const dynamic = "force-dynamic";

export default async function MemberHelpersPage() {
  const [helpers, categories] = await Promise.all([
    getTaskLibrary(),
    getCategories(),
  ]);

  return (
    <main className="app-shell">
      <h1 className="page-title">Helpers</h1>
      <p
        className="form-note"
        style={{
          marginBottom: "var(--space-lg)",
          maxWidth: 640,
          fontSize: "1rem",
          lineHeight: 1.5,
        }}
      >
        Each helper handles one kind of family work — meal planning, research,
        drafting, planning. Search for what you need, then click{" "}
        <strong>Bring this helper in</strong> and we&apos;ll take it from there.
      </p>
      <HelperLibrary helpers={helpers} categories={categories} />
    </main>
  );
}
