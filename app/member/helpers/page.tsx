import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getTaskLibrary,
  getCategories,
  type TaskLibraryItem,
} from "@/lib/task-library";
import { getSuggestedTasks } from "@/lib/suggested-tasks";
import HelperLibrary from "../../components/HelperLibrary";

export const dynamic = "force-dynamic";

export default async function MemberHelpersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/member/helpers"));

  const [helpers, categories] = await Promise.all([
    getTaskLibrary(),
    getCategories(),
  ]);

  // Build a "Suggested for you" row above the search by reusing the same
  // ranking the /member home uses.
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "preferred_name, full_name, city, state, timezone, partner_name, kids_count, kids_ages, household_members, diet_notes, custom_field_values",
    )
    .eq("id", user.id)
    .maybeSingle();

  const { data: pastTickets } = await supabase
    .from("tickets")
    .select("category, subject")
    .eq("member_id", user.id)
    .in("status", ["completed", "closed"])
    .order("completed_at", { ascending: false });

  const pastForSuggestions = (pastTickets ?? []).map((t) => ({
    category: t.category ?? null,
    subject: t.subject ?? null,
  }));

  const suggestedHelpers: TaskLibraryItem[] = getSuggestedTasks(
    profile ?? null,
    pastForSuggestions,
    helpers,
    { limit: 6 },
  );

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
        Each helper handles one kind of family work. Search for what you need,
        then click <strong>Bring this helper in</strong> — we&apos;ll email you
        back within 24 hours.
      </p>
      <HelperLibrary
        helpers={helpers}
        categories={categories}
        suggestedHelpers={suggestedHelpers}
      />
    </main>
  );
}
