"use client";

import { useState, useEffect, useCallback } from "react";

export type RealExample = {
  id: string;
  title: string;
  /** Pasted prompt from the CEO / request text */
  requestText: string;
  /** Optional card thumbnail (set by CEO). Falls back to first deliverable image or placeholder. */
  thumbnailUrl?: string;
  /** 1–5 image URLs for the deliverable (book flipper in modal) */
  deliverableImages?: string[];
  /** PDF URL for the deliverable (shown in iframe in modal). Used when no deliverableImages. */
  deliverablePdf?: string;
  caption?: string;
};

type ExploreRealExamplesProps = {
  /** Examples from DB (admin-managed). When empty, section still renders with no cards. */
  examples?: RealExample[];
};

const PROMPT_PREVIEW_LENGTH = 120;

function ExampleCard({
  example,
  onOpen,
}: {
  example: RealExample;
  onOpen: () => void;
}) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const thumbnail =
    example.thumbnailUrl ?? example.deliverableImages?.[0] ?? (example.deliverablePdf ? null : null);
  const showPlaceholder = !thumbnail || thumbFailed;
  const preview =
    example.requestText.slice(0, PROMPT_PREVIEW_LENGTH).trim() +
    (example.requestText.length > PROMPT_PREVIEW_LENGTH ? "…" : "");

  return (
    <article className="real-example-card">
      <div className="real-example-card-thumb">
        {showPlaceholder ? (
          <div className="real-example-card-thumb-placeholder">
            <span className="real-example-card-thumb-placeholder-text">
              {example.deliverablePdf ? "PDF" : "Example"}
            </span>
          </div>
        ) : (
          <img
            src={thumbnail}
            alt=""
            role="presentation"
            className="real-example-card-thumb-img"
            onError={() => setThumbFailed(true)}
          />
        )}
      </div>
      <div className="real-example-card-body">
        <h3 className="real-example-card-title">{example.title}</h3>
        <p className="real-example-card-prompt">{preview}</p>
        <button
          type="button"
          className="real-example-card-btn"
          onClick={onOpen}
          aria-label={`View example: ${example.title}`}
        >
          View example
        </button>
      </div>
    </article>
  );
}

function BookFlipper({
  images,
  altPrefix,
  onClose,
}: {
  images: string[];
  altPrefix: string;
  onClose: () => void;
}) {
  const [page, setPage] = useState(0);
  const [failedPages, setFailedPages] = useState<Set<number>>(new Set());
  const total = images.length;

  const goPrev = useCallback(() => {
    setPage((p) => (p <= 0 ? p : p - 1));
  }, []);
  const goNext = useCallback(() => {
    setPage((p) => (p >= total - 1 ? p : p + 1));
  }, [total]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext]);

  const currentFailed = failedPages.has(page);

  return (
    <div className="real-example-flipper">
      {total > 1 && (
        <button
          type="button"
          className="real-example-flipper-prev"
          onClick={goPrev}
          disabled={page <= 0}
          aria-label="Previous page"
        >
          ‹
        </button>
      )}
      <div className="real-example-flipper-page">
        {currentFailed ? (
          <div
            className="real-example-flipper-img real-example-flipper-placeholder"
            style={{
              minHeight: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-alt, #f2f0ec)",
              color: "var(--text-soft, #8a8681)",
              fontSize: "0.9375rem",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
            }}
          >
            Image unavailable
          </div>
        ) : (
          <img
            src={images[page]}
            alt={`${altPrefix}, page ${page + 1} of ${total}`}
            className="real-example-flipper-img"
            onError={() => setFailedPages((prev) => new Set(prev).add(page))}
          />
        )}
      </div>
      {total > 1 && (
        <button
          type="button"
          className="real-example-flipper-next"
          onClick={goNext}
          disabled={page >= total - 1}
          aria-label="Next page"
        >
          ›
        </button>
      )}
      {total > 1 && (
        <div className="real-example-flipper-dots" role="tablist" aria-label="Pages">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={page === i}
              aria-label={`Page ${i + 1}`}
              className={`real-example-flipper-dot ${page === i ? "real-example-flipper-dot--active" : ""}`}
              onClick={() => setPage(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExampleModal({
  example,
  onClose,
}: {
  example: RealExample;
  onClose: () => void;
}) {
  const hasImages =
    example.deliverableImages && example.deliverableImages.length > 0;
  const hasPdf = !!example.deliverablePdf;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="real-example-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="real-example-modal-title"
    >
      <div className="real-example-modal">
        <button
          type="button"
          className="real-example-modal-close real-example-modal-close--top"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 id="real-example-modal-title" className="real-example-modal-title">
          {example.title}
        </h2>
        {hasImages ? (
          <BookFlipper
            images={example.deliverableImages!}
            altPrefix={example.title}
            onClose={onClose}
          />
        ) : hasPdf ? (
          <>
            <iframe
              src={example.deliverablePdf}
              title={example.title}
              className="real-example-modal-iframe"
            />
          </>
        ) : null}
        {example.caption && (
          <p className="real-example-modal-caption">{example.caption}</p>
        )}
      </div>
    </div>
  );
}

export default function ExploreRealExamples({ examples: examplesProp = [] }: ExploreRealExamplesProps) {
  const examples = examplesProp ?? [];
  const [openId, setOpenId] = useState<string | null>(null);
  const openExample = examples.find((e) => e.id === openId);

  return (
    <section
      id="explore-real-examples"
      className="section section-alt explore-real-examples"
    >
      <div className="container">
        <h2 className="section-title">Explore real examples</h2>
        <p className="section-lead">
          See what a real request and deliverable look like — from a quick
          email to a shoppable list or multi-page plan. Click any card to open
          and flip through.
        </p>

        <div className="real-example-cards">
          {examples.map((ex) => (
            <ExampleCard
              key={ex.id}
              example={ex}
              onOpen={() => setOpenId(ex.id)}
            />
          ))}
        </div>
      </div>

      {openExample && (
        <ExampleModal
          example={openExample}
          onClose={() => setOpenId(null)}
        />
      )}
    </section>
  );
}
