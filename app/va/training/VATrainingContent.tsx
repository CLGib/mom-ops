"use client";

const SECTION_STYLE = {
  marginBottom: "var(--space-md)",
  border: "1px solid var(--color-border, #e5e5e5)",
  borderRadius: "var(--radius, 6px)",
  overflow: "hidden",
};

const SUMMARY_STYLE = {
  padding: "var(--space-sm) var(--space-md)",
  cursor: "pointer" as const,
  fontWeight: 600,
  fontSize: "1rem",
  listStyle: "none" as const,
  backgroundColor: "var(--accent-soft-bg, #f8f5ed)",
};

const DETAIL_CONTENT_STYLE = {
  padding: "var(--space-md)",
  paddingTop: 0,
  whiteSpace: "pre-wrap" as const,
  lineHeight: 1.5,
};

export type TrainingSection = {
  id: string;
  title: string;
  content: string;
  sort_order: number;
  video_url?: string | null;
  video_url_2?: string | null;
  image_urls?: string | null;
  pdf_urls?: string | null;
};

type Props = {
  sections: TrainingSection[];
};

export default function VATrainingContent({ sections }: Props) {
  if (sections.length === 0) {
    return (
      <p className="form-note">
        No training sections are available yet. Please check back later or contact your manager.
      </p>
    );
  }

  return (
    <article className="va-training-guide" style={{ maxWidth: "720px" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "var(--space-md)" }}>
        Mom Ops VA Training
      </h1>
      <p style={{ marginBottom: "var(--space-xl)", fontSize: "1.0625rem", lineHeight: 1.5 }}>
        Complete each section below. When you&apos;re done, confirm and mark training complete so you can start claiming tasks.
      </p>

      {sections.map((section) => {
        const videoUrl = section.video_url?.trim() || null;
        const videoUrl2 = section.video_url_2?.trim() || null;
        const imageUrlList = section.image_urls
          ? section.image_urls.trim().split(/\n/).map((u) => u.trim()).filter(Boolean)
          : [];
        const pdfUrlList = section.pdf_urls
          ? section.pdf_urls.trim().split(/\n/).map((u) => u.trim()).filter(Boolean)
          : [];
        return (
          <details key={section.id} style={SECTION_STYLE}>
            <summary style={SUMMARY_STYLE}>{section.title}</summary>
            <div style={{ ...DETAIL_CONTENT_STYLE, display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              {(videoUrl || videoUrl2) && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "var(--space-2xs)", fontSize: "0.9375rem" }}>Videos</div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                    {videoUrl && (
                      <li>
                        <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="link" style={{ wordBreak: "break-all" }}>
                          Watch Part 1 →
                        </a>
                      </li>
                    )}
                    {videoUrl2 && (
                      <li>
                        <a href={videoUrl2} target="_blank" rel="noopener noreferrer" className="link" style={{ wordBreak: "break-all" }}>
                          Watch Part 2 →
                        </a>
                      </li>
                    )}
                  </ul>
                </div>
              )}
              {pdfUrlList.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "var(--space-2xs)", fontSize: "0.9375rem" }}>PDFs</div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                    {pdfUrlList.map((url, i) => (
                      <li key={i}>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="link" style={{ wordBreak: "break-all" }}>
                          View PDF {pdfUrlList.length > 1 ? (i + 1) : ""} →
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {imageUrlList.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "var(--space-sm)", fontSize: "0.9375rem" }}>Screenshots</div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                    {imageUrlList.map((url, i) => (
                      <li key={i}>
                        <img
                          src={url}
                          alt={`Screenshot ${i + 1}`}
                          style={{ maxWidth: "100%", height: "auto", borderRadius: 4, border: "1px solid var(--color-border, #e5e5e5)" }}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {section.content ? (
                <div style={{ whiteSpace: "pre-wrap" as const, lineHeight: 1.5 }}>
                  {section.content.replace(/\\n/g, "\n")}
                </div>
              ) : null}
            </div>
          </details>
        );
      })}
    </article>
  );
}
