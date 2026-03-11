export type ReviewItem = {
  id: string;
  task_subject: string;
  rating: number;
  comment: string | null;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} star${rating === 1 ? "" : "s"}`}>
      {"★".repeat(rating)}
      <span style={{ color: "var(--border, #e8e6e2)" }}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

/** Show first name only for privacy on public marketing. */
function firstNameOnly(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "Anonymous";
  const first = trimmed.split(/\s+/)[0];
  return first || "Anonymous";
}

function formatReviewDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ReviewCard({ item }: { item: ReviewItem }) {
  const name = firstNameOnly(item.display_name?.trim() || "Anonymous");
  const comment = item.comment?.trim() || null;
  const dateStr = formatReviewDate(item.created_at);

  return (
    <article
      className="reviews-carousel-card"
      style={{
        flex: "0 0 auto",
        width: "min(320px, 85vw)",
        maxWidth: "320px",
      }}
    >
      <p className="reviews-carousel-name">{name}</p>
      <p className="reviews-carousel-stars">
        <Stars rating={item.rating} />
      </p>
      {comment && (
        <p className="reviews-carousel-comment">&ldquo;{comment}&rdquo;</p>
      )}
      <p className="reviews-carousel-task">{item.task_subject}</p>
      {dateStr && (
        <p className="reviews-carousel-date">{dateStr}</p>
      )}
    </article>
  );
}

type Props = {
  items: ReviewItem[];
  title?: string;
  subtitle?: string;
};

export default function ReviewsCarousel({ items, title, subtitle }: Props) {
  if (items.length === 0) return null;

  return (
    <section id="reviews" className="section section-alt reviews-carousel-section">
      <div className="container">
        {title && (
          <h2 className="section-title reviews-carousel-title">{title}</h2>
        )}
        {subtitle && (
          <p className="section-lead reviews-carousel-subtitle">{subtitle}</p>
        )}
        <div
          className="reviews-carousel-track"
          role="region"
          aria-label="Customer reviews"
        >
          <div className="reviews-carousel-inner">
            {items.map((item) => (
              <ReviewCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
