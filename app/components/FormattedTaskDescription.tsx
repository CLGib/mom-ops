"use client";

/**
 * Parses task description text (often "Label: value" pairs in one paragraph)
 * and renders it in a scannable format for VAs: intro line + definition list.
 */
function parseLabelValuePairs(description: string): { intro: string | null; pairs: { label: string; value: string }[] } {
  const trimmed = description.trim();
  if (!trimmed) return { intro: null, pairs: [] };

  // Match " Label: " where label can contain letters, numbers, spaces, /, ()
  const labelRegex = /\s+([A-Za-z][A-Za-z0-9\s\/\(\)]*):\s+/g;
  const matches = [...trimmed.matchAll(labelRegex)];

  if (matches.length === 0) {
    return { intro: trimmed, pairs: [] };
  }

  const introEnd = matches[0].index!;
  const intro = introEnd > 0 ? trimmed.slice(0, introEnd).trim() : null;

  const pairs: { label: string; value: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const label = matches[i][1].trim();
    const valueStart = matches[i].index! + matches[i][0].length;
    const valueEnd = matches[i + 1] ? matches[i + 1].index! : trimmed.length;
    const value = trimmed.slice(valueStart, valueEnd).trim();
    if (value) pairs.push({ label, value });
  }

  return { intro, pairs };
}

/**
 * If description has newlines, split into lines and treat "Label: value" per line.
 */
function parseLines(description: string): { intro: string | null; pairs: { label: string; value: string }[] } {
  const lines = description.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { intro: null, pairs: [] };
  if (lines.length === 1) return parseLabelValuePairs(description);

  const pairs: { label: string; value: string }[] = [];
  let intro: string | null = null;
  for (const line of lines) {
    const colonIdx = line.indexOf(": ");
    if (colonIdx > 0) {
      pairs.push({
        label: line.slice(0, colonIdx).trim(),
        value: line.slice(colonIdx + 2).trim(),
      });
    } else if (pairs.length === 0 && !line.includes(":")) {
      intro = line;
    } else if (line) {
      pairs.push({ label: "", value: line });
    }
  }
  return { intro, pairs };
}

type Props = { description: string; className?: string; style?: React.CSSProperties };

export default function FormattedTaskDescription({ description, className, style }: Props) {
  const hasNewlines = /\r?\n/.test(description);
  const { intro, pairs } = hasNewlines ? parseLines(description) : parseLabelValuePairs(description);

  // No structure detected: render as single paragraph (preserve whitespace)
  if (pairs.length === 0) {
    return (
      <div className={className} style={{ whiteSpace: "pre-wrap", ...style }}>
        {intro ?? description}
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      {intro && (
        <p style={{ margin: "0 0 var(--space-sm) 0", fontWeight: 600 }}>
          {intro}
        </p>
      )}
      <dl
        style={{
          margin: 0,
          display: "grid",
          gap: "var(--space-xs) 0",
          gridTemplateColumns: "auto 1fr",
          alignItems: "baseline",
        }}
      >
        {pairs.map(({ label, value }, i) => (
          <span key={i} style={{ display: "contents" }}>
            {label ? (
              <>
                <dt
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    color: "var(--text, inherit)",
                    paddingRight: "var(--space-sm)",
                  }}
                >
                  {label}:
                </dt>
                <dd style={{ margin: 0, color: "var(--text-muted, #666)" }}>
                  {value}
                </dd>
              </>
            ) : (
              <dd style={{ margin: 0, gridColumn: "1 / -1", color: "var(--text-muted, #666)" }}>
                {value}
              </dd>
            )}
          </span>
        ))}
      </dl>
    </div>
  );
}
