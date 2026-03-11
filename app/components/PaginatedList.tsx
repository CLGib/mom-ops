"use client";

import { useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 20;

type Props<T> = {
  items: T[];
  pageSize?: number;
  children: (item: T) => React.ReactNode;
  listClassName?: string;
  listStyle?: React.CSSProperties;
};

export function PaginatedList<T extends { id: string }>({
  items,
  pageSize = DEFAULT_PAGE_SIZE,
  children,
  listClassName,
  listStyle,
}: Props<T>) {
  const safeItems = Array.isArray(items) ? items : [];
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(safeItems.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = useMemo(
    () => safeItems.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
    [safeItems, currentPage, pageSize]
  );

  if (safeItems.length === 0) return null;

  return (
    <>
      <ul className={listClassName} style={{ listStyleType: "none", padding: 0, margin: 0, ...listStyle }}>
        {paginated.map((item) => (
          <li key={item?.id ?? String(Math.random())}>{children(item)}</li>
        ))}
      </ul>
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "var(--space-md)", marginTop: "var(--space-md)", alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={currentPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span className="form-note">
            Page {currentPage + 1} of {totalPages} ({safeItems.length} total)
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
