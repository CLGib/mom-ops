import { describe, it, expect } from "vitest";
import { unsubscribeToken, verifyUnsubscribe, unsubscribeUrl, isNewsletterOwner } from "@/lib/newsletter";

describe("newsletter unsubscribe tokens", () => {
  it("is deterministic and case/space-insensitive for the same email", () => {
    expect(unsubscribeToken("a@b.com")).toBe(unsubscribeToken("  A@B.COM "));
  });

  it("verifies a valid token and rejects a forged one", () => {
    const t = unsubscribeToken("real@x.com");
    expect(verifyUnsubscribe("real@x.com", t)).toBe(true);
    expect(verifyUnsubscribe("real@x.com", "deadbeef")).toBe(false);
    expect(verifyUnsubscribe("real@x.com", t.slice(0, -1) + "0")).toBe(false);
    // token for one email must not unsubscribe another
    expect(verifyUnsubscribe("attacker@x.com", t)).toBe(false);
  });

  it("rejects empty inputs", () => {
    expect(verifyUnsubscribe("", "x")).toBe(false);
    expect(verifyUnsubscribe("a@b.com", "")).toBe(false);
  });

  it("builds a one-click url with the email and its token", () => {
    const url = unsubscribeUrl("Foo@Bar.com");
    expect(url).toContain("/api/unsubscribe?e=foo%40bar.com");
    expect(url).toContain(`t=${unsubscribeToken("foo@bar.com")}`);
  });
});

describe("newsletter owner allowlist", () => {
  it("recognizes the owner and rejects everyone else", () => {
    expect(isNewsletterOwner("clriley903@gmail.com")).toBe(true);
    expect(isNewsletterOwner("CLRILEY903@gmail.com")).toBe(true);
    expect(isNewsletterOwner("random@stranger.com")).toBe(false);
    expect(isNewsletterOwner(null)).toBe(false);
  });
});
