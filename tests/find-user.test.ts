import { describe, it, expect } from "vitest";
import { findUserIdByEmail } from "@/lib/find-user";

/** Minimal fake of the Supabase query-builder chain used by findUserIdByEmail. */
function fakeDb(row: { id: string } | null, capture: { email?: string } = {}) {
  const chain = {
    from: () => chain,
    select: () => chain,
    eq: (_col: string, val: string) => {
      capture.email = val;
      return chain;
    },
    limit: () => chain,
    maybeSingle: async () => ({ data: row }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return chain as any;
}

describe("findUserIdByEmail", () => {
  it("returns null for empty/nullish email without touching the db", async () => {
    let touched = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = { from: () => { touched = true; return db; } };
    expect(await findUserIdByEmail(db, "")).toBeNull();
    expect(await findUserIdByEmail(db, null)).toBeNull();
    expect(await findUserIdByEmail(db, undefined)).toBeNull();
    expect(touched).toBe(false);
  });

  it("normalizes email (trim + lowercase) before the lookup", async () => {
    const capture: { email?: string } = {};
    const db = fakeDb({ id: "user-1" }, capture);
    const id = await findUserIdByEmail(db, "  Foo@Bar.COM ");
    expect(capture.email).toBe("foo@bar.com");
    expect(id).toBe("user-1");
  });

  it("returns null when no profile matches", async () => {
    const db = fakeDb(null);
    expect(await findUserIdByEmail(db, "missing@x.com")).toBeNull();
  });
});
