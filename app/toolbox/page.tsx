import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/task-library";
import ToolboxClient from "./ToolboxClient";
import type { HowToVideoRecord } from "./ToolboxHowToVideoCard";

export const dynamic = "force-dynamic";

type CardRow = {
  id: string;
  title: string;
  prompt: string;
  suggested_ai: string | null;
  how_to_use: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type TemplateRow = {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  created_by: string;
  author: string;
  created_at: string;
  updated_at: string;
};

export default async function ToolboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/toolbox"));

  const [
    { data: roleRow },
    { data: adminRow },
    { data: directorRow },
  ] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("directors").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const role = roleRow?.role ?? null;
  const isAdmin = role === "admin" || !!adminRow;
  const isDirector = role === "director" || !!directorRow;
  const isVa = role === "va";
  if (!isVa && !isAdmin && !isDirector) redirect("/no-access");

  let cardRows: CardRow[] = [];
  let templateRows: TemplateRow[] = [];
  let videoRows: HowToVideoRecord[] = [];
  let loadError: string | null = null;
  let taskCategories: string[] = [];

  const [
    { data: cards, error: cardsError },
    { data: templatesData, error: templatesError },
    { data: videoData, error: videosError },
    categories,
  ] = await Promise.all([
    supabase
      .from("va_toolbox_cards")
      .select("id, title, prompt, suggested_ai, how_to_use, created_by, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("va_toolbox_templates")
      .select("id, title, description, file_path, file_name, created_by, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("va_how_to_videos")
      .select("id, title, description, youtube_url, task_category, example_ticket_id, sort_order, created_at, updated_at")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
    getCategories(),
  ]);

  if (cardsError) {
    loadError = loadError ?? cardsError.message;
  }
  if (templatesError) {
    loadError = loadError ?? templatesError.message;
  }
  if (videosError) {
    loadError = loadError ?? videosError.message;
  }

  if (!loadError) {
    cardRows = (cards ?? []).map((c) => ({
      id: c.id,
      title: c.title ?? "",
      prompt: c.prompt ?? "",
      suggested_ai: c.suggested_ai ?? null,
      how_to_use: c.how_to_use ?? null,
      created_by: c.created_by,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));

    const templateUserIds = [...new Set((templatesData ?? []).map((t) => t.created_by))];
    const authorMap: Record<string, string> = {};
    if (templateUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, preferred_name, full_name")
        .in("id", templateUserIds);
      for (const p of profiles ?? []) {
        authorMap[p.id] = p.preferred_name?.trim() || p.full_name?.trim() || "Unknown";
      }
    }

    templateRows = (templatesData ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      file_path: t.file_path,
      file_name: t.file_name,
      created_by: t.created_by,
      author: authorMap[t.created_by] ?? "Unknown",
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));

    const videos = (videoData ?? []) as (HowToVideoRecord & { example_ticket_number?: number | null })[];
    const ticketIds = [...new Set(videos.map((v) => v.example_ticket_id).filter(Boolean))] as string[];
    let ticketNumbers: Record<string, number> = {};
    if (ticketIds.length > 0) {
      const { data: tickets } = await supabase
        .from("tickets")
        .select("id, ticket_number")
        .in("id", ticketIds);
      for (const t of tickets ?? []) {
        ticketNumbers[t.id] = t.ticket_number ?? 0;
      }
    }
    videoRows = videos.map((v) => ({
      ...v,
      example_ticket_number: v.example_ticket_id ? (ticketNumbers[v.example_ticket_id] ?? null) : null,
    }));
    taskCategories = categories ?? [];
  }

  return (
    <main className="app-shell">
      <h1 className="page-title">VA Toolbox</h1>
      <ToolboxClient
        initialCards={cardRows}
        initialTemplates={templateRows}
        initialVideos={videoRows}
        taskCategories={taskCategories}
        canManageVideos={isAdmin || isDirector}
        currentUserId={user.id}
        loadError={loadError}
      />
    </main>
  );
}
