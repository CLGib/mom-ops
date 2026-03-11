import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import CommunityClient from "./CommunityClient";

export const dynamic = "force-dynamic";

const LIMIT = 20;

export default async function VACommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va/community"));

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (roleRow?.role !== "va") redirect("/va");

  const { data: vaProfile } = await supabase
    .from("va_profiles")
    .select("training_complete")
    .eq("user_id", user.id)
    .maybeSingle();
  if (vaProfile?.training_complete !== true) redirect("/va/training");

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const headersList = await headers();
  const cookie = headersList.get("cookie") ?? "";
  const search = new URLSearchParams();
  search.set("page", String(page));
  search.set("limit", String(LIMIT));
  if (q) search.set("q", q);
  const res = await fetch(`${siteUrl}/api/va/community/posts?${search}`, {
    cache: "no-store",
    headers: { cookie },
  });
  const data = await res.json().catch(() => ({}));

  const initialPosts = Array.isArray(data.posts) ? data.posts : [];
  const initialTotal = typeof data.total === "number" ? data.total : 0;
  const initialPage = typeof data.page === "number" ? data.page : page;

  return (
    <CommunityClient
      initialPosts={initialPosts}
      initialTotal={initialTotal}
      initialPage={initialPage}
      initialQ={q}
    />
  );
}
