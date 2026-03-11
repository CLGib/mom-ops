"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ToolboxCard, { type ToolboxCardRecord } from "./ToolboxCard";
import CreateEditCardModal from "./CreateEditCardModal";
import ToolboxTemplateCard, { type ToolboxTemplateRecord } from "./ToolboxTemplateCard";
import CreateEditTemplateModal from "./CreateEditTemplateModal";
import ToolboxHowToVideoCard, { type HowToVideoRecord } from "./ToolboxHowToVideoCard";
import CreateEditHowToVideoModal from "./CreateEditHowToVideoModal";

type Props = {
  initialCards: ToolboxCardRecord[];
  initialTemplates: ToolboxTemplateRecord[];
  initialVideos: HowToVideoRecord[];
  taskCategories: string[];
  canManageVideos: boolean;
  currentUserId: string;
  loadError?: string | null;
};

export default function ToolboxClient({
  initialCards,
  initialTemplates,
  initialVideos,
  taskCategories,
  canManageVideos,
  currentUserId,
  loadError,
}: Props) {
  const router = useRouter();
  const [cards, setCards] = useState<ToolboxCardRecord[]>(initialCards);
  const [templates, setTemplates] = useState<ToolboxTemplateRecord[]>(initialTemplates);
  const [videos, setVideos] = useState<HowToVideoRecord[]>(initialVideos);
  const [promptSearch, setPromptSearch] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [videoSearch, setVideoSearch] = useState("");
  const [videoCategoryFilter, setVideoCategoryFilter] = useState("");
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ToolboxCardRecord | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ToolboxTemplateRecord | null>(null);
  const [editingVideo, setEditingVideo] = useState<HowToVideoRecord | null>(null);

  const filteredCards = useMemo(() => {
    const q = promptSearch.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.prompt && c.prompt.toLowerCase().includes(q)) ||
        (c.suggested_ai && c.suggested_ai.toLowerCase().includes(q)) ||
        (c.how_to_use && c.how_to_use.toLowerCase().includes(q))
    );
  }, [cards, promptSearch]);

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q)) ||
        t.author.toLowerCase().includes(q) ||
        t.file_name.toLowerCase().includes(q)
    );
  }, [templates, templateSearch]);

  const filteredVideos = useMemo(() => {
    let list = [...videos];
    const q = videoSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          (v.description?.toLowerCase().includes(q)) ||
          (v.task_category?.toLowerCase().includes(q))
      );
    }
    if (videoCategoryFilter) {
      list = list.filter((v) => v.task_category === videoCategoryFilter);
    }
    return list;
  }, [videos, videoSearch, videoCategoryFilter]);

  const videoCategoriesForFilter = useMemo(() => {
    const set = new Set(videos.map((v) => v.task_category).filter((c): c is string => typeof c === "string" && c.length > 0));
    return Array.from(set).sort();
  }, [videos]);

  async function refetchCards() {
    const res = await fetch("/api/toolbox/cards", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setCards(data.cards ?? []);
    }
  }

  async function refetchTemplates() {
    const res = await fetch("/api/toolbox/templates", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.templates ?? []);
    }
  }

  function openCreateCard() {
    setEditingCard(null);
    setCardModalOpen(true);
  }

  function openEditCard(card: ToolboxCardRecord) {
    setEditingCard(card);
    setCardModalOpen(true);
  }

  async function handleDeleteCard(id: string) {
    const res = await fetch(`/api/toolbox/cards/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setCards((prev) => prev.filter((c) => c.id !== id));
  }

  function openCreateTemplate() {
    setEditingTemplate(null);
    setTemplateModalOpen(true);
  }

  function openEditTemplate(template: ToolboxTemplateRecord) {
    setEditingTemplate(template);
    setTemplateModalOpen(true);
  }

  async function handleDeleteTemplate(id: string) {
    const res = await fetch(`/api/toolbox/templates/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  function openCreateVideo() {
    setEditingVideo(null);
    setVideoModalOpen(true);
  }

  function openEditVideo(video: HowToVideoRecord) {
    setEditingVideo(video);
    setVideoModalOpen(true);
  }

  async function handleDeleteVideo(id: string) {
    const res = await fetch(`/api/toolbox/how-to-videos/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setVideos((prev) => prev.filter((v) => v.id !== id));
    }
  }

  async function refetchVideos() {
    const res = await fetch("/api/toolbox/how-to-videos", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setVideos(data.videos ?? []);
    }
  }

  return (
    <>
      {loadError && (
        <div
          className="form-note"
          role="alert"
          style={{
            marginBottom: "var(--space-lg)",
            padding: "var(--space-md)",
            backgroundColor: "var(--color-warning-bg, #fef3c7)",
            borderRadius: "var(--radius-md, 6px)",
            color: "var(--color-warning-text, #92400e)",
          }}
        >
          Could not load some data: {loadError}. You can still add new prompts and templates; try refreshing to see existing items.
        </div>
      )}
      {/* Prompts section */}
      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>
          Prompts
        </h2>
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          Helpful prompts for internal use. Copy into Claude, Gemini, or other AI tools.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)", alignItems: "center", marginBottom: "var(--space-lg)" }}>
          <input
            type="search"
            className="form-input"
            placeholder="Search prompts by title, prompt, or suggested AI"
            value={promptSearch}
            onChange={(e) => setPromptSearch(e.target.value)}
            style={{ flex: 1, minWidth: "14rem" }}
            aria-label="Search prompts"
          />
          <button type="button" onClick={openCreateCard} className="btn btn-primary">
            Create prompt
          </button>
        </div>
        {filteredCards.length === 0 ? (
          <p className="form-note">
            {cards.length === 0 ? "No prompts yet. Create one to get started." : "No prompts match your search."}
          </p>
        ) : (
          <div>
            {filteredCards.map((card) => (
              <ToolboxCard
                key={card.id}
                card={card}
                currentUserId={currentUserId}
                onEdit={openEditCard}
                onDelete={handleDeleteCard}
              />
            ))}
          </div>
        )}
      </section>

      {/* Templates section */}
      <section>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>
          Templates
        </h2>
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          DOCX, Google Sheets (XLSX/CSV), or PDF uploads. Download and use for member tasks. These are meant as a starting point and can be edited and adjusted as needed.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)", alignItems: "center", marginBottom: "var(--space-lg)" }}>
          <input
            type="search"
            className="form-input"
            placeholder="Search templates by title, description, or author"
            value={templateSearch}
            onChange={(e) => setTemplateSearch(e.target.value)}
            style={{ flex: 1, minWidth: "14rem" }}
            aria-label="Search templates"
          />
          <button type="button" onClick={openCreateTemplate} className="btn btn-primary">
            Add template
          </button>
        </div>
        {filteredTemplates.length === 0 ? (
          <p className="form-note">
            {templates.length === 0 ? "No templates yet. Add one to get started." : "No templates match your search."}
          </p>
        ) : (
          <div>
            {filteredTemplates.map((template) => (
              <ToolboxTemplateCard
                key={template.id}
                template={template}
                currentUserId={currentUserId}
                onEdit={openEditTemplate}
                onDelete={handleDeleteTemplate}
              />
            ))}
          </div>
        )}
      </section>

      {/* How-to videos section */}
      <section id="how-to-videos" style={{ marginTop: "var(--space-2xl)" }}>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>
          How-to videos
        </h2>
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          Searchable YouTube how-to videos for common tasks. Optional link to an example ticket for full details.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)", alignItems: "center", marginBottom: "var(--space-lg)" }}>
          <input
            type="search"
            className="form-input"
            placeholder="Search by title, description, or category"
            value={videoSearch}
            onChange={(e) => setVideoSearch(e.target.value)}
            style={{ flex: 1, minWidth: "14rem" }}
            aria-label="Search how-to videos"
          />
          {videoCategoriesForFilter.length > 0 && (
            <select
              className="form-input"
              value={videoCategoryFilter}
              onChange={(e) => setVideoCategoryFilter(e.target.value)}
              style={{ minWidth: "10rem" }}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {videoCategoriesForFilter.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          {canManageVideos && (
            <button type="button" onClick={openCreateVideo} className="btn btn-primary">
              Add how-to video
            </button>
          )}
        </div>
        {filteredVideos.length === 0 ? (
          <p className="form-note">
            {videos.length === 0 ? "No how-to videos yet." : "No videos match your search."}
          </p>
        ) : (
          <div>
            {filteredVideos.map((video) => (
              <ToolboxHowToVideoCard
                key={video.id}
                video={video}
                canManage={canManageVideos}
                onEdit={canManageVideos ? openEditVideo : undefined}
                onDelete={canManageVideos ? handleDeleteVideo : undefined}
              />
            ))}
          </div>
        )}
      </section>

      <CreateEditCardModal
        open={cardModalOpen}
        onClose={() => { setCardModalOpen(false); setEditingCard(null); }}
        onSaved={refetchCards}
        editCard={editingCard}
      />
      <CreateEditTemplateModal
        open={templateModalOpen}
        onClose={() => { setTemplateModalOpen(false); setEditingTemplate(null); }}
        onSaved={refetchTemplates}
        editTemplate={editingTemplate}
      />
      <CreateEditHowToVideoModal
        open={videoModalOpen}
        onClose={() => { setVideoModalOpen(false); setEditingVideo(null); }}
        onSaved={() => { refetchVideos(); router.refresh(); }}
        editVideo={editingVideo}
        taskCategories={taskCategories}
      />
    </>
  );
}
