"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

export default function AdminMembersSearch({ initialSearch = "" }: { initialSearch?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);

  const apply = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    if (search.trim()) params.set("search", search.trim());
    else params.delete("search");
    router.push(`/admin/members?${params.toString()}`);
  }, [router, search, searchParams]);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", alignItems: "center", marginBottom: "var(--space-md)" }}>
      <input
        type="search"
        className="input"
        placeholder="Search by name or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), apply())}
        style={{ maxWidth: "20rem" }}
        aria-label="Search members"
      />
      <button type="button" className="btn btn-primary" onClick={apply}>
        Search
      </button>
    </div>
  );
}
