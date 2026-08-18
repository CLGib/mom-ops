import { describe, it, expect } from "vitest";
import { brandedBlocksToHtml } from "@/lib/branded-blocks-to-html";

describe("brandedBlocksToHtml", () => {
  it("renders **bold**, *italic*, and `code` inline markdown", () => {
    const html = brandedBlocksToHtml([
      { type: "paragraph", content: "**Skill:** learn *fast* with `git`" },
    ]);
    expect(html).toContain("<strong>Skill:</strong>");
    expect(html).toContain("<em>fast</em>");
    expect(html).toContain("<code>git</code>");
  });

  it("escapes HTML before applying markdown (XSS protection)", () => {
    const html = brandedBlocksToHtml([
      { type: "paragraph", content: "<script>alert('x')</script>" },
    ]);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("only linkifies http(s)/mailto, never javascript: urls", () => {
    const ok = brandedBlocksToHtml([{ type: "paragraph", content: "see [site](https://x.com)" }]);
    expect(ok).toContain('href="https://x.com"');

    const bad = brandedBlocksToHtml([{ type: "paragraph", content: "[x](javascript:alert(1))" }]);
    expect(bad).not.toContain('href="javascript');
  });

  it("renders numbered and bullet lists as real list markup", () => {
    expect(brandedBlocksToHtml([{ type: "numberedList", items: ["a", "b"] }])).toBe(
      "<ol><li>a</li><li>b</li></ol>"
    );
    expect(brandedBlocksToHtml([{ type: "bulletList", items: ["a"] }])).toBe("<ul><li>a</li></ul>");
  });
});
