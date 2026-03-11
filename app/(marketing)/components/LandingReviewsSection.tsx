import { createClient } from "@/lib/supabase/server";
import ReviewsCarousel, { type ReviewItem } from "./ReviewsCarousel";

const LIMIT = 20;

export default async function LandingReviewsSection() {
  let items: ReviewItem[] = [];
  try {
    const supabase = await createClient();
    const { data: rows } = await supabase.rpc("get_public_reviews_feed", {
      p_search: null,
      p_rating_filter: "4+",
      p_category: null,
      p_limit: LIMIT,
      p_offset: 0,
    });

    items = (rows ?? []).map((r: Record<string, unknown>) => ({
      id: (r.id as string) ?? "",
      task_subject: (r.task_subject as string) ?? "Task",
      rating: Number(r.rating) || 5,
      comment: (r.comment as string) ?? null,
      created_at: (r.created_at as string) ?? new Date().toISOString(),
      display_name: (r.display_name as string) ?? null,
      avatar_url: (r.avatar_url as string) ?? null,
    }));
  } catch (e) {
    console.error("[LandingReviewsSection] fetch failed:", e);
  }

  return (
    <ReviewsCarousel items={items} title="What members are saying" />
  );
}
