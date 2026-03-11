"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { formatRelative } from "@/lib/format-date";
import { getFirstNameOnly } from "@/lib/member-display-name";

export type FeedItem = {
  id: string;
  task_subject: string;
  rating: number;
  comment: string | null;
  created_at: string;
  member_id: string;
  display_name: string | null;
  avatar_url: string | null;
  va_id: string | null;
  va_display_name: string | null;
  category: string | null;
};

function Avatar({ displayName, avatarUrl }: { displayName: string; avatarUrl: string | null }) {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        width={40}
        height={40}
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          objectFit: "cover",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "var(--accent-soft-bg, #f8f5ed)",
        color: "var(--accent, #b8860b)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.875rem",
        fontWeight: 600,
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} star${rating === 1 ? "" : "s"}`}>
      {"★".repeat(rating)}
      <span style={{ color: "var(--border, #e8e6e2)" }}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

const COMMENT_PREVIEW_LEN = 120;

export function ReviewCard({
  item,
  workedWithVaIds = [],
}: { item: FeedItem; workedWithVaIds?: string[] }) {
  const name = getFirstNameOnly(item.display_name);
  const vaName = item.va_display_name?.trim() || "Specialist";
  const hasWorkedWithVa = item.va_id ? workedWithVaIds.includes(item.va_id) : false;
  const [expanded, setExpanded] = useState(false);
  const comment = item.comment?.trim() || null;
  const showExpand = comment && comment.length > COMMENT_PREVIEW_LEN;
  const preview = showExpand && !expanded ? comment.slice(0, COMMENT_PREVIEW_LEN) + "…" : comment;

  const requestUrl = `/member?subject=${encodeURIComponent(item.task_subject)}&requested_va_id=${encodeURIComponent(item.va_id ?? "")}&from_review_id=${encodeURIComponent(item.id)}&from_review=1${item.category ? `&category=${encodeURIComponent(item.category)}` : ""}`;

  return (
    <article
      className="card"
      style={{
        display: "flex",
        gap: "var(--space-md)",
        alignItems: "flex-start",
        padding: "var(--space-md)",
      }}
    >
      <Avatar displayName={name} avatarUrl={item.avatar_url} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>{name}</p>
        <h3 style={{ margin: "var(--space-xs) 0", fontSize: "1rem", fontWeight: 600 }}>
          {item.task_subject}
        </h3>
        <p style={{ margin: "var(--space-xs) 0", color: "var(--accent, #b8860b)", fontSize: "1rem" }}>
          <Stars rating={item.rating} />
        </p>
        {preview && (
          <p style={{ margin: "var(--space-xs) 0", color: "var(--text-muted, #5c5955)" }}>
            &ldquo;{preview}&rdquo;
            {showExpand && (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="link"
                style={{ marginLeft: "var(--space-2xs)", fontSize: "inherit" }}
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </p>
        )}
        <p className="form-note" style={{ margin: "var(--space-xs) 0 0" }}>
          {formatRelative(item.created_at)}
        </p>
        {item.va_id && (
          <div style={{ marginTop: "var(--space-sm)", display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", alignItems: "center" }}>
            <span className="form-note" style={{ fontSize: "0.85rem" }}>
              Specialist:{" "}
              <Link href={`/member/specialist/${item.va_id}`} className="link">
                {vaName}
              </Link>
            </span>
            {hasWorkedWithVa ? (
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "2px 6px",
                  background: "var(--accent-soft-bg, #f8f5ed)",
                  color: "var(--accent, #b8860b)",
                  borderRadius: 4,
                }}
              >
                You&apos;ve worked with this specialist
              </span>
            ) : (
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "2px 6px",
                  background: "var(--color-border, #e8e6e2)",
                  color: "var(--text-muted, #5c5955)",
                  borderRadius: 4,
                }}
              >
                New specialist request
              </span>
            )}
            <Link
              href={requestUrl}
              className="btn btn-primary"
              style={{ fontSize: "0.875rem" }}
            >
              Have This Specialist Do This For Me
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

type CategoryOption = { value: string; label: string };

type Props = {
  items: FeedItem[];
  search: string;
  ratingFilter: string;
  categoryFilter: string;
  categoryOptions: CategoryOption[];
  page: number;
  pageSize: number;
  workedWithVaIds: string[];
};

export default function ReviewsFeedClient({
  items,
  search: initialSearch,
  ratingFilter: initialRating,
  categoryFilter: initialCategory,
  categoryOptions,
  page,
  pageSize,
  workedWithVaIds,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [ratingFilter, setRatingFilter] = useState(initialRating);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);

  const applyFilters = useCallback(
    (resetPage = true) => {
      const params = new URLSearchParams(searchParams);
      if (search.trim()) params.set("search", search.trim());
      else params.delete("search");
      if (ratingFilter !== "all") params.set("rating", ratingFilter);
      else params.delete("rating");
      if (categoryFilter.trim()) params.set("category", categoryFilter.trim());
      else params.delete("category");
      if (resetPage) params.delete("page");
      router.push(`/member/reviews?${params.toString()}`);
    },
    [router, search, ratingFilter, categoryFilter, searchParams]
  );

  const goToPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams);
      if (search.trim()) params.set("search", search.trim());
      if (ratingFilter !== "all") params.set("rating", ratingFilter);
      if (categoryFilter.trim()) params.set("category", categoryFilter.trim());
      params.set("page", String(newPage));
      router.push(`/member/reviews?${params.toString()}`);
    },
    [router, search, ratingFilter, categoryFilter, searchParams]
  );

  const hasMore = items.length === pageSize;
  const hasPrev = page > 0;

  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-sm)",
          marginBottom: "var(--space-lg)",
          alignItems: "center",
        }}
      >
        <input
          type="search"
          className="input"
          placeholder="Search by keyword"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          style={{ maxWidth: "20rem" }}
          aria-label="Search reviews"
        />
        <select
          className="input"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: "auto" }}
          aria-label="Filter by category"
        >
          {categoryOptions.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          style={{ width: "auto" }}
          aria-label="Filter by rating"
        >
          <option value="all">All ratings</option>
          <option value="5">5 stars</option>
          <option value="4+">4+ stars</option>
        </select>
        <button type="button" className="btn btn-primary" onClick={() => applyFilters()}>
          Apply
        </button>
      </div>
      {items.length === 0 ? (
        <p className="form-note">No public reviews match your filters yet.</p>
      ) : (
        <>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            {items.map((item) => (
              <li key={item.id}>
                <ReviewCard item={item} workedWithVaIds={workedWithVaIds} />
              </li>
            ))}
          </ul>
          {(hasPrev || hasMore) && (
            <div style={{ display: "flex", gap: "var(--space-md)", marginTop: "var(--space-lg)", alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!hasPrev}
                onClick={() => goToPage(page - 1)}
              >
                Previous
              </button>
              <span className="form-note">Page {page + 1}</span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!hasMore}
                onClick={() => goToPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
