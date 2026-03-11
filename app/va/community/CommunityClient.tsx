"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatInCentral } from "@/lib/format-date";
import CommunityMessageBody from "./CommunityMessageBody";
import CommentForm from "./CommentForm";
import CreatePostForm from "./CreatePostForm";

const LIMIT = 20;

type Post = {
  id: string;
  author_id: string;
  author_display_name: string;
  title: string | null;
  body: string;
  ticket_id: string | null;
  ticket_number: number | null;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  liked: boolean;
};

type Comment = {
  id: string;
  author_id: string;
  author_display_name: string;
  body: string;
  created_at: string;
};

function extractTicketNumbers(text: string): number[] {
  const set = new Set<number>();
  const re = /#(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (Number.isInteger(n) && n > 0) set.add(n);
  }
  return Array.from(set);
}

export default function CommunityClient({
  initialPosts,
  initialTotal,
  initialPage,
  initialQ,
}: {
  initialPosts: Post[];
  initialTotal: number;
  initialPage: number;
  initialQ: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [q, setQ] = useState(initialQ);
  const [loading, setLoading] = useState(false);
  const [ticketIdByNumber, setTicketIdByNumber] = useState<Record<string, string>>({});
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [expandedPost, setExpandedPost] = useState<Post | null>(null);
  const [expandedComments, setExpandedComments] = useState<Comment[]>([]);
  const [expandedCommentsTotal, setExpandedCommentsTotal] = useState(0);
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [submittingLike, setSubmittingLike] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const pageQ = searchParams.get("q") ?? "";
  const pagePage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const fetchPosts = useCallback(async (searchQ: string, pageNum: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(pageNum));
    params.set("limit", String(LIMIT));
    if (searchQ) params.set("q", searchQ);
    const res = await fetch(`/api/va/community/posts?${params}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok && Array.isArray(data.posts)) {
      setPosts(data.posts);
      setTotal(data.total ?? 0);
      setPage(data.page ?? pageNum);
      setQ(searchQ);
      return data.posts as Post[];
    }
    return [];
  }, []);

  useEffect(() => {
    if (pageQ !== q || pagePage !== page) {
      fetchPosts(pageQ, pagePage).then((list) => {
        setPosts(list);
        setPage(pagePage);
        setQ(pageQ);
      });
    }
  }, [pageQ, pagePage]); // eslint-disable-line react-hooks/exhaustive-deps

  const syncUrl = useCallback(
    (newQ: string, newPage: number) => {
      const params = new URLSearchParams();
      if (newQ) params.set("q", newQ);
      if (newPage > 1) params.set("page", String(newPage));
      router.push(`/va/community${params.toString() ? `?${params}` : ""}`);
    },
    [router]
  );

  const handleSearch = useCallback(
    (value: string) => {
      syncUrl(value, 1);
      setQ(value);
      setPage(1);
    },
    [syncUrl]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      syncUrl(q, newPage);
      setPage(newPage);
    },
    [syncUrl, q]
  );

  const numbers = useMemo(() => {
    const set = new Set<number>();
    posts.forEach((p) => extractTicketNumbers(p.body).forEach((n) => set.add(n)));
    if (expandedPost) {
      extractTicketNumbers(expandedPost.body).forEach((n) => set.add(n));
      expandedComments.forEach((c) => extractTicketNumbers(c.body).forEach((n) => set.add(n)));
    }
    return Array.from(set);
  }, [posts, expandedPost, expandedComments]);

  useEffect(() => {
    if (numbers.length === 0) {
      setTicketIdByNumber({});
      return;
    }
    fetch(`/api/va/community/ticket-by-number?numbers=${numbers.join(",")}`, { credentials: "include" })
      .then((r) => r.json())
      .then((map: Record<string, string>) => setTicketIdByNumber(map || {}))
      .catch(() => setTicketIdByNumber({}));
  }, [numbers.join(",")]);

  const loadExpandedPost = useCallback(async (postId: string) => {
    const res = await fetch(`/api/va/community/posts/${postId}?comments_page=1&comments_limit=20`, {
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.id) {
      setExpandedPost(data);
      setExpandedComments(data.comments ?? []);
      setExpandedCommentsTotal(data.comments_total ?? 0);
      setExpandedPostId(postId);
    }
  }, []);

  const toggleLike = useCallback(async (postId: string) => {
    if (submittingLike) return;
    setSubmittingLike(postId);
    const res = await fetch(`/api/va/community/posts/${postId}/like`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    setSubmittingLike(null);
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, liked: data.liked, like_count: data.like_count ?? p.like_count } : p
        )
      );
      if (expandedPostId === postId && expandedPost) {
        setExpandedPost((prev) => (prev ? { ...prev, liked: data.liked, like_count: data.like_count ?? prev.like_count } : null));
      }
    }
  }, [submittingLike, expandedPostId, expandedPost]);

  const submitComment = useCallback(
    async (postId: string, body: string) => {
      if (!body.trim() || submittingComment) return;
      setSubmittingComment(postId);
      const res = await fetch(`/api/va/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: body.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      setSubmittingComment(null);
      if (res.ok && data.id) {
        const newComment: Comment = {
          id: data.id,
          author_id: data.author_id,
          author_display_name: data.author_display_name ?? "VA",
          body: data.body,
          created_at: data.created_at,
        };
        setExpandedComments((prev) => [...prev, newComment]);
        setExpandedCommentsTotal((prev) => prev + 1);
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p))
        );
      }
    },
    [submittingComment]
  );

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 className="page-title" style={{ marginBottom: "var(--space-md)" }}>
        Community Hub
      </h1>
      <p style={{ color: "var(--text-muted, #666)", marginBottom: "var(--space-lg)" }}>
        Ask questions, share how you solved tasks, and connect with other VAs.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", marginBottom: "var(--space-lg)" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = (e.target as HTMLFormElement).querySelector<HTMLInputElement>('input[name="q"]');
            handleSearch(input?.value ?? "");
          }}
          style={{ display: "flex", gap: "var(--space-sm)", flex: "1 1 200px" }}
        >
          <input
            type="search"
            name="q"
            placeholder="Search posts..."
            defaultValue={initialQ}
            key={initialQ}
            style={{ flex: 1, padding: "var(--space-sm) var(--space-md)", borderRadius: "var(--radius, 6px)", border: "1px solid var(--color-border, #e5e5e5)" }}
            aria-label="Search posts"
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowCreateForm((v) => !v)}
          aria-expanded={showCreateForm}
        >
          {showCreateForm ? "Cancel" : "New post"}
        </button>
      </div>

      {showCreateForm && (
        <CreatePostForm
          onSuccess={() => {
            setShowCreateForm(false);
            fetchPosts(q, 1);
            syncUrl(q, 1);
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {loading && posts.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : posts.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No posts yet. Be the first to share!</p>
      ) : (
        <>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {posts.map((post) => (
              <li
                key={post.id}
                className="card"
                style={{
                  marginBottom: "var(--space-md)",
                  padding: "var(--space-md)",
                  border: "1px solid var(--color-border, #e5e5e5)",
                  borderRadius: "var(--radius, 6px)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-xs)" }}>
                  <span style={{ fontWeight: 600 }}>{post.author_display_name}</span>
                  <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    {formatInCentral(post.created_at)}
                  </span>
                </div>
                {post.ticket_number != null && (
                  <p style={{ marginBottom: "var(--space-xs)", fontSize: "0.875rem" }}>
                    <Link href={`/va/${post.ticket_id}`} className="link">
                      Re: Task #{post.ticket_number}
                    </Link>
                  </p>
                )}
                {post.title && (
                  <h2 style={{ fontSize: "1.125rem", margin: "0 0 var(--space-xs)" }}>{post.title}</h2>
                )}
                <div style={{ marginBottom: "var(--space-sm)" }}>
                  <CommunityMessageBody message={post.body} ticketIdByNumber={ticketIdByNumber} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }}
                    onClick={() => toggleLike(post.id)}
                    disabled={!!submittingLike}
                    aria-pressed={post.liked}
                  >
                    {post.liked ? "Liked" : "Like"} ({post.like_count})
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: "var(--space-2xs) var(--space-sm)", fontSize: "0.875rem" }}
                    onClick={() => (expandedPostId === post.id ? setExpandedPostId(null) : loadExpandedPost(post.id))}
                    aria-expanded={expandedPostId === post.id}
                  >
                    Comments ({post.comment_count})
                  </button>
                </div>

                {expandedPostId === post.id && expandedPost && (
                  <div style={{ marginTop: "var(--space-md)", paddingTop: "var(--space-md)", borderTop: "1px solid var(--color-border, #e5e5e5)" }}>
                    <h3 style={{ fontSize: "1rem", marginBottom: "var(--space-sm)" }}>Comments</h3>
                    {expandedComments.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No comments yet.</p>
                    ) : (
                      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 var(--space-md)" }}>
                        {expandedComments.map((c) => (
                          <li key={c.id} style={{ marginBottom: "var(--space-sm)", padding: "var(--space-sm)", background: "var(--color-muted-bg, #f5f5f5)", borderRadius: "var(--radius, 6px)" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{c.author_display_name}</span>
                            <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginLeft: "var(--space-xs)" }}>
                              {formatInCentral(c.created_at)}
                            </span>
                            <div style={{ marginTop: "var(--space-2xs)" }}>
                              <CommunityMessageBody message={c.body} ticketIdByNumber={ticketIdByNumber} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <CommentForm
                      postId={post.id}
                      onSubmit={submitComment}
                      submitting={submittingComment === post.id}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav
              style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginTop: "var(--space-lg)", flexWrap: "wrap" }}
              aria-label="Pagination"
            >
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page <= 1 || loading}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </button>
              <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                Page {page} of {totalPages} ({total} total)
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page >= totalPages || loading}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
