import { describe, it, expect } from "vitest";
import { getAllKits, getPublishedKits, getKit, formatKitPrice } from "@/lib/kits";

describe("kits catalog", () => {
  it("formats cents as dollars", () => {
    expect(formatKitPrice(295)).toBe("$2.95");
    expect(formatKitPrice(995)).toBe("$9.95");
    expect(formatKitPrice(0)).toBe("$0.00");
  });

  it("getKit resolves a known slug and returns null otherwise", () => {
    expect(getKit("syllabus-builder")?.slug).toBe("syllabus-builder");
    expect(getKit("nope-not-real")).toBeNull();
  });

  it("getPublishedKits returns only published kits (Camp stays parked)", () => {
    const pub = getPublishedKits();
    expect(pub.length).toBeGreaterThan(0);
    expect(pub.every((k) => k.published)).toBe(true);
    expect(pub.find((k) => k.slug === "neighborhood-camp")).toBeUndefined();
  });

  it("every published kit has the fields the storefront + generator rely on", () => {
    for (const k of getPublishedKits()) {
      expect(k.title).toBeTruthy();
      expect(k.blurb).toBeTruthy();
      expect(k.priceCents).toBeGreaterThan(0);
      expect(k.whatsIncluded.length).toBeGreaterThan(0);
      expect(k.inputFields.length).toBeGreaterThan(0);
      expect(k.playbookTemplate).toContain("#");
      expect(k.customizationPrompt.length).toBeGreaterThan(50);
    }
  });

  it("no kit content contains an em dash (brand voice rule)", () => {
    for (const k of getAllKits()) {
      const blob = [
        k.title,
        k.blurb,
        ...k.whatsIncluded,
        k.playbookTemplate,
        k.customizationPrompt,
        ...k.inputFields.flatMap((f) => [f.label, f.placeholder ?? "", ...(f.options ?? [])]),
      ].join(" ");
      expect(blob, `em dash found in kit "${k.slug}"`).not.toContain("—");
    }
  });
});
