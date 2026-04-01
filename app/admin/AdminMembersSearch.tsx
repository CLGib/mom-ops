"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

type Props = {
  initialSearch?: string;
  initialCreatedFrom?: string;
  initialCreatedTo?: string;
};

export default function AdminMembersSearch({
  initialSearch = "",
  initialCreatedFrom = "",
  initialCreatedTo = "",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [createdFrom, setCreatedFrom] = useState(initialCreatedFrom);
  const [createdTo, setCreatedTo] = useState(initialCreatedTo);

  const apply = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    if (search.trim()) params.set("search", search.trim());
    else params.delete("search");
    if (createdFrom) params.set("created_from", createdFrom);
    else params.delete("created_from");
    if (createdTo) params.set("created_to", createdTo);
    else params.delete("created_to");
    params.delete("page"); // reset to first page when filters change
    router.push(`/admin/members?${params.toString()}`);
  }, [router, search, createdFrom, createdTo, searchParams]);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xs)", alignItems: "center", marginBottom: "var(--space-sm)" }}>
      <input
        type="search"
        className="input"
        placeholder="Search by name or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), apply())}
        style={{ maxWidth: "16rem", fontSize: "0.875rem", padding: "4px 8px" }}
        aria-label="Search members"
      />
      <label className="form-note" style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem" }}>
        Created from
        <input
          type="date"
          className="input"
          value={createdFrom}
          onChange={(e) => setCreatedFrom(e.target.value)}
          style={{ fontSize: "0.8rem", padding: "2px 6px", width: "10rem" }}
          aria-label="Created from date"
        />
      </label>
      <label className="form-note" style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem" }}>
        to
        <input
          type="date"
          className="input"
          value={createdTo}
          onChange={(e) => setCreatedTo(e.target.value)}
          style={{ fontSize: "0.8rem", padding: "2px 6px", width: "10rem" }}
          aria-label="Created to date"
        />
      </label>
      <button type="button" className="btn btn-primary" onClick={apply} style={{ fontSize: "0.875rem", padding: "4px 10px" }}>
        Apply
      </button>
    </div>
  );
}
