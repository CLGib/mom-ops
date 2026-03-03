import { unstable_noStore } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewsFeedClient, { type FeedItem } from "./ReviewsFeedClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  { value: "household", label: "Household" },
  { value: "school", label: "School & activities" },
  { value: "events", label: "Events & celebrations" },
  { value: "research", label: "Research & comparisons" },
  { value: "gifts", label: "Gifts & sourcing" },
  { value: "travel", label: "Travel" },
  { value: "admin", label: "CEO" },
  { value: "other", label: "Other" },
];

export default async function MemberReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; rating?: string; category?: string; page?: string }>;
}) {
  unstable_noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/member/reviews"));

  const params = await searchParams;
  const search = (params.search ?? "").trim();
  const ratingFilter = params.rating === "5" || params.rating === "4+" ? params.rating : "all";
  const categoryFilter = (params.category ?? "").trim();
  const page = Math.max(0, parseInt(params.page ?? "0", 10) || 0);
  const offset = page * PAGE_SIZE;

  const { data: rows } = await supabase.rpc("get_public_reviews_feed", {
    p_search: search || null,
    p_rating_filter: ratingFilter,
    p_category: categoryFilter || null,
    p_limit: PAGE_SIZE,
    p_offset: offset,
  });

  const items: FeedItem[] = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    task_subject: (r.task_subject as string) ?? "Task",
    rating: Number(r.rating) || 0,
    comment: (r.comment as string) ?? null,
    created_at: (r.created_at as string) ?? new Date().toISOString(),
    member_id: (r.member_id as string) ?? "",
    display_name: (r.display_name as string) ?? null,
    avatar_url: (r.avatar_url as string) ?? null,
    va_id: (r.va_id as string) ?? null,
    va_display_name: (r.va_display_name as string) ?? null,
    category: (r.category as string) ?? null,
  }));

  let workedWithVaIds: string[] = [];
  const { data: myTickets } = await supabase
    .from("tickets")
    .select("assigned_va_id")
    .eq("member_id", user.id)
    .not("assigned_va_id", "is", null)
    .in("status", ["completed", "closed"]);
  if (myTickets) {
    workedWithVaIds = [...new Set(myTickets.map((t) => t.assigned_va_id!).filter(Boolean))];
  }

  return (
    <div style={{ width: "100%", maxWidth: "100%", margin: "0 auto", padding: "var(--space-lg)" }}>
      <h1 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>
        Reviews
      </h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        See what other members thought. Request the same specialist for a similar task.
      </p>
      <ReviewsFeedClient
        items={items}
        search={params.search ?? ""}
        ratingFilter={ratingFilter}
        categoryFilter={categoryFilter}
        categoryOptions={CATEGORY_OPTIONS}
        page={page}
        pageSize={PAGE_SIZE}
        workedWithVaIds={workedWithVaIds}
      />
    </div>
  );
}
