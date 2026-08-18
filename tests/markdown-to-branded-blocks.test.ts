import { describe, it, expect } from "vitest";
import { markdownToBrandedDocInput } from "@/lib/markdown-to-branded-blocks";

describe("markdownToBrandedDocInput", () => {
  it("extracts the H1 as the title", () => {
    const { title } = markdownToBrandedDocInput("# Your Personal Edge\n\nHello.");
    expect(title).toBe("Your Personal Edge");
  });

  it("parses headings, paragraphs, and bullet + numbered lists", () => {
    const md = `# T\n\n## Section\n\nA paragraph.\n\n- one\n- two\n\n1. first\n2. second`;
    const { blocks } = markdownToBrandedDocInput(md);
    const types = blocks.map((b) => b.type);
    expect(types).toContain("heading2");
    expect(types).toContain("paragraph");
    expect(types).toContain("bulletList");
    expect(types).toContain("numberedList");

    const bullets = blocks.find((b) => b.type === "bulletList");
    expect(bullets && bullets.type === "bulletList" && bullets.items).toEqual(["one", "two"]);
    const numbers = blocks.find((b) => b.type === "numberedList");
    expect(numbers && numbers.type === "numberedList" && numbers.items).toEqual(["first", "second"]);
  });

  it("parses a markdown table with a header separator row", () => {
    const md = `# T\n\n| Item | Qty |\n| --- | --- |\n| Cups | 12 |`;
    const { blocks } = markdownToBrandedDocInput(md);
    const table = blocks.find((b) => b.type === "table");
    expect(table && table.type === "table").toBe(true);
    if (table && table.type === "table") {
      expect(table.headers).toEqual(["Item", "Qty"]);
      expect(table.rows[0]).toEqual(["Cups", "12"]);
    }
  });
});
