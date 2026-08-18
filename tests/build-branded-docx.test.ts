import { describe, it, expect } from "vitest";
import { buildBrandedDocx } from "@/lib/build-branded-docx";
import { markdownToBrandedDocInput } from "@/lib/markdown-to-branded-blocks";

describe("buildBrandedDocx", () => {
  it("produces a valid, non-empty .docx buffer from markdown", async () => {
    const input = markdownToBrandedDocInput(
      "# Title\n\n## Section\n\nHello.\n\n1. one\n2. two\n\n- a\n- b"
    );
    const buf = await buildBrandedDocx(input);
    expect(buf.length).toBeGreaterThan(1000);
    // .docx is a zip archive, which always starts with the "PK" magic bytes.
    expect(buf.subarray(0, 2).toString("latin1")).toBe("PK");
  });
});
