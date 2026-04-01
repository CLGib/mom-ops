import { unstable_noStore } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTaskLibrary } from "@/lib/task-library";
import RecurringTaskList from "./RecurringTaskList";
import RecurringTaskForm from "./RecurringTaskForm";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function MemberRecurringPage() {
  unstable_noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/member/recurring"));

  const [{ data: recurringRows }, taskLibrary] = await Promise.all([
    supabase
      .from("member_recurring_tasks")
      .select("id, member_id, task_library_id, subject, description_template, schedule_type, schedule_config, context_notes, credit_cost, is_active, last_created_at, created_at")
      .eq("member_id", user.id)
      .order("created_at", { ascending: false }),
    getTaskLibrary(),
  ]);

  const recurring = (recurringRows ?? []).map((r) => {
    const config = (r.schedule_config as { day_of_week?: number }) ?? {};
    const dayOfWeek = typeof config.day_of_week === "number" ? config.day_of_week : 0;
    const taskName =
      r.task_library_id != null
        ? taskLibrary.find((t) => t.id === r.task_library_id)?.task ?? "Task"
        : (r.subject ?? "Recurring task");
    return {
      id: r.id,
      task_library_id: r.task_library_id,
      subject: r.subject,
      description_template: r.description_template,
      schedule_type: r.schedule_type,
      day_of_week: dayOfWeek,
      day_label: DAY_LABELS[dayOfWeek] ?? "Unknown",
      context_notes: r.context_notes,
      credit_cost: r.credit_cost,
      is_active: r.is_active ?? true,
      last_created_at: r.last_created_at,
      created_at: r.created_at,
      task_name: taskName,
    };
  });

  const { data: balance } = await supabase.rpc("get_member_balance", {
    p_member_id: user.id,
  });
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();
  const isActive =
    profile?.subscription_status === "active" || (typeof balance === "number" && balance > 0);

  return (
    <main className="app-shell">
      <h1 className="page-title">Recurring tasks</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Set up tasks that repeat on a schedule (e.g. a weekly meal plan every Saturday). We’ll create a new task for you automatically on the day you choose.
      </p>

      {recurring.length > 0 && (
        <section style={{ marginBottom: "var(--space-2xl)" }}>
          <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>
            Your recurring tasks
          </h2>
          <RecurringTaskList items={recurring} />
        </section>
      )}

      <section>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>
          {recurring.length > 0 ? "Add another recurring task" : "Add a recurring task"}
        </h2>
        {isActive ? (
          <div className="card">
            <RecurringTaskForm taskLibrary={taskLibrary} existingCount={recurring.length} />
          </div>
        ) : (
          <p className="form-note">
            Reactivate your subscription to add recurring tasks.
          </p>
        )}
      </section>
    </main>
  );
}
