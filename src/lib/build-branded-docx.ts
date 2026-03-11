/**
 * Build a Mom Ops branded .docx from structured content.
 * Uses brand tokens and docx-js rules from the VA toolbox seed spec.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  TableBorders,
  Header,
  BorderStyle,
  WidthType,
  ShadingType,
  AlignmentType,
  HeadingLevel,
  LevelFormat,
  type IBorderOptions,
} from "docx";
import {
  BRAND_COLORS,
  BRAND_FONTS,
  BRAND_FONT_SIZES,
  BRAND_SPACING,
  PAGE_SIZE,
} from "./brand-tokens";

const MARGIN = BRAND_SPACING.marginInch;
const CONTENT_WIDTH = BRAND_SPACING.contentWidth;

const goldRule: IBorderOptions = {
  style: BorderStyle.SINGLE,
  size: 6,
  color: BRAND_COLORS.gold,
  space: 1,
};
const noBorder: IBorderOptions = { style: BorderStyle.NONE, size: 0 };
const tableBorder: IBorderOptions = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: BRAND_COLORS.border,
};
const cellMargins = {
  top: BRAND_SPACING.cellMarginTopBottom,
  bottom: BRAND_SPACING.cellMarginTopBottom,
  left: BRAND_SPACING.cellMarginLeftRight,
  right: BRAND_SPACING.cellMarginLeftRight,
};

export type BrandedDocBlock =
  | { type: "paragraph"; content: string }
  | { type: "heading2"; text: string }
  | { type: "heading3"; text: string }
  | { type: "bulletList"; items: string[] }
  | { type: "numberedList"; items: string[]; reference?: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "callout"; label?: string; text: string; variant?: "note" | "success" }
  | { type: "rule" };

export type BrandedDocInput = {
  title: string;
  preparedBy?: string;
  preparedFor?: string;
  date?: string;
  blocks: BrandedDocBlock[];
};

/** Split text by **bold** and *italic* and return TextRun options (no newlines in runs). */
function parseInlineFormatting(
  text: string,
  baseFont: string,
  baseSize: number,
  baseColor: string
): { text: string; bold?: boolean; italics?: boolean; font?: string; size?: number; color?: string }[] {
  const out: { text: string; bold?: boolean; italics?: boolean; font?: string; size?: number; color?: string }[] = [];
  let remaining = text;
  const font = baseFont;
  const size = baseSize;
  const color = baseColor;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/\*(.+?)\*/);
    let next: { index: number; length: number; bold?: boolean; italics?: boolean; inner: string } | null = null;

    if (boldMatch && boldMatch.index !== undefined) {
      next = {
        index: boldMatch.index,
        length: boldMatch[0].length,
        bold: true,
        inner: boldMatch[1],
      };
    }
    if (italicMatch && italicMatch.index !== undefined) {
      const useItalic =
        !next || italicMatch.index < next.index;
      if (useItalic) {
        next = {
          index: italicMatch.index,
          length: italicMatch[0].length,
          italics: true,
          inner: italicMatch[1],
        };
      }
    }

    if (!next) {
      const plain = remaining.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
      if (plain.length > 0) {
        out.push({ text: plain, font, size, color });
      }
      break;
    }

    if (next.index > 0) {
      const plain = remaining.slice(0, next.index).replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
      if (plain.length > 0) {
        out.push({ text: plain, font, size, color });
      }
    }
    out.push({
      text: next.inner,
      bold: next.bold,
      italics: next.italics,
      font,
      size,
      color,
    });
    remaining = remaining.slice(next.index + next.length);
  }
  return out;
}

function createParagraphRuns(
  content: string,
  font: string = BRAND_FONTS.body,
  size: number = BRAND_FONT_SIZES.body,
  color: string = BRAND_COLORS.muted
): TextRun[] {
  const parts = parseInlineFormatting(content, font, size, color);
  return parts.map((p) =>
    new TextRun({
      text: p.text,
      font: p.font ?? font,
      size: p.size ?? size,
      color: p.color ?? color,
      bold: p.bold,
      italics: p.italics,
    })
  );
}

function buildBodyBlocks(
  blocks: BrandedDocBlock[],
  numberingRefs: { bullets: string; numbers: string }
): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];

  for (const block of blocks) {
    if (block.type === "paragraph") {
      result.push(
        new Paragraph({
          children: createParagraphRuns(block.content),
          spacing: {
            after: BRAND_SPACING.bodyAfter,
            line: BRAND_SPACING.bodyLineSpacing,
          },
        })
      );
      continue;
    }
    if (block.type === "heading2") {
      result.push(
        new Paragraph({
          children: [
            new TextRun({
              text: block.text,
              font: BRAND_FONTS.heading,
              size: BRAND_FONT_SIZES.h2,
              color: BRAND_COLORS.dark,
            }),
          ],
          spacing: {
            before: BRAND_SPACING.beforeH2,
            after: BRAND_SPACING.afterH2,
          },
          heading: HeadingLevel.HEADING_2,
        })
      );
      continue;
    }
    if (block.type === "heading3") {
      result.push(
        new Paragraph({
          children: [
            new TextRun({
              text: block.text,
              font: BRAND_FONTS.body,
              size: BRAND_FONT_SIZES.h3,
              color: BRAND_COLORS.dark,
              bold: true,
            }),
          ],
          spacing: {
            before: BRAND_SPACING.beforeH3,
            after: BRAND_SPACING.afterH3,
          },
          heading: HeadingLevel.HEADING_3,
        })
      );
      continue;
    }
    if (block.type === "bulletList") {
      for (const item of block.items) {
        result.push(
          new Paragraph({
            children: createParagraphRuns(item),
            numbering: { reference: numberingRefs.bullets, level: 0 },
            spacing: { after: 120 },
          })
        );
      }
      continue;
    }
    if (block.type === "numberedList") {
      for (const item of block.items) {
        result.push(
          new Paragraph({
            children: createParagraphRuns(item),
            numbering: { reference: numberingRefs.numbers, level: 0 },
            spacing: { after: 120 },
          })
        );
      }
      continue;
    }
    if (block.type === "rule") {
      result.push(
        new Paragraph({
          border: { bottom: goldRule },
          spacing: { before: BRAND_SPACING.ruleBeforeAfter, after: BRAND_SPACING.ruleBeforeAfter },
        })
      );
      continue;
    }
    if (block.type === "callout") {
      const isSuccess = block.variant === "success";
      const leftColor = isSuccess ? BRAND_COLORS.sage : BRAND_COLORS.gold;
      const bgFill = isSuccess ? BRAND_COLORS.successBg : BRAND_COLORS.accentSoftBg;
      const label = block.label ? `${block.label}: ` : "";
      const cell = new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: label,
                font: BRAND_FONTS.body,
                size: BRAND_FONT_SIZES.body,
                color: BRAND_COLORS.dark,
                bold: true,
              }),
              ...createParagraphRuns(block.text),
            ],
            spacing: { after: 0 },
          }),
        ],
        shading: { fill: bgFill, type: ShadingType.CLEAR },
        margins: cellMargins,
        borders: {
          left: { style: BorderStyle.SINGLE, size: 12, color: leftColor },
          top: noBorder,
          bottom: noBorder,
          right: noBorder,
        },
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      });
      const table = new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [CONTENT_WIDTH],
        rows: [new TableRow({ children: [cell] })],
        borders: TableBorders.NONE,
      });
      result.push(table);
      result.push(
        new Paragraph({
          spacing: { after: BRAND_SPACING.bodyAfter },
        })
      );
      continue;
    }
    if (block.type === "table") {
      const { headers, rows } = block;
      const colCount = headers.length;
      const colWidth = Math.floor(CONTENT_WIDTH / colCount);
      const columnWidths = Array(colCount).fill(colWidth) as number[];
      const totalWidth = colWidth * colCount;

      const tableRows: TableRow[] = [];
      tableRows.push(
        new TableRow({
          children: headers.map((h) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: h,
                      font: BRAND_FONTS.body,
                      size: BRAND_FONT_SIZES.tableHeader,
                      color: BRAND_COLORS.white,
                      bold: true,
                    }),
                  ],
                }),
              ],
              shading: { fill: BRAND_COLORS.gold, type: ShadingType.CLEAR },
              margins: cellMargins,
              borders: {
                top: tableBorder,
                bottom: tableBorder,
                left: tableBorder,
                right: tableBorder,
              },
              width: { size: colWidth, type: WidthType.DXA },
            })
          ),
        })
      );
      rows.forEach((row, i) => {
        const bgFill = i % 2 === 0 ? BRAND_COLORS.white : BRAND_COLORS.bgAlt;
        tableRows.push(
          new TableRow({
            children: row.map((cellText) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: createParagraphRuns(cellText),
                    spacing: { after: 0 },
                  }),
                ],
                shading: { fill: bgFill, type: ShadingType.CLEAR },
                margins: cellMargins,
                borders: {
                  top: tableBorder,
                  bottom: tableBorder,
                  left: tableBorder,
                  right: tableBorder,
                },
                width: { size: colWidth, type: WidthType.DXA },
              })
            ),
          })
        );
      });
      const table = new Table({
        width: { size: totalWidth, type: WidthType.DXA },
        columnWidths,
        rows: tableRows,
        borders: {
          top: tableBorder,
          bottom: tableBorder,
          left: tableBorder,
          right: tableBorder,
          insideHorizontal: tableBorder,
          insideVertical: tableBorder,
        },
      });
      result.push(table);
      result.push(
        new Paragraph({
          spacing: { after: BRAND_SPACING.bodyAfter },
        })
      );
    }
  }
  return result;
}

export async function buildBrandedDocx(input: BrandedDocInput): Promise<Buffer> {
  const numberingConfig = [
    {
      reference: "mom-ops-bullets",
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          style: {
            paragraph: { indent: { left: 720 } },
          },
        },
      ],
    },
    {
      reference: "mom-ops-numbers",
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.START,
          style: {
            paragraph: { indent: { left: 720 } },
          },
        },
      ],
    },
  ] as const;

  const numberingRefs = { bullets: "mom-ops-bullets", numbers: "mom-ops-numbers" };
  const bodyChildren = buildBodyBlocks(input.blocks, numberingRefs);

  const headerParagraph = new Paragraph({
    children: [
      new TextRun({
        text: "Mom Ops, LLC",
        font: BRAND_FONTS.heading,
        size: 20,
        color: BRAND_COLORS.gold,
      }),
    ],
    border: { bottom: goldRule },
  });

  const confidentialLine = new Paragraph({
    children: [
      new TextRun({
        text: "Mom Ops, LLC Confidential",
        font: BRAND_FONTS.body,
        size: BRAND_FONT_SIZES.confidential,
        color: BRAND_COLORS.soft,
      }),
    ],
    spacing: { after: 200 },
  });

  const titleParagraph = new Paragraph({
    children: [
      new TextRun({
        text: input.title,
        font: BRAND_FONTS.heading,
        size: BRAND_FONT_SIZES.h1,
        color: BRAND_COLORS.dark,
      }),
    ],
    spacing: { after: BRAND_SPACING.afterH1 },
    heading: HeadingLevel.HEADING_1,
  });

  const titleRule = new Paragraph({
    border: { bottom: goldRule },
    spacing: { before: 0, after: BRAND_SPACING.ruleBeforeAfter },
  });

  const sectionChildren: (Paragraph | Table)[] = [
    confidentialLine,
    titleParagraph,
    titleRule,
    ...bodyChildren,
  ];

  const doc = new Document({
    numbering: { config: numberingConfig },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_SIZE.width,
              height: PAGE_SIZE.height,
            },
            margin: {
              top: MARGIN,
              right: MARGIN,
              bottom: MARGIN,
              left: MARGIN,
            },
          },
        },
        headers: {
          default: new Header({
            children: [headerParagraph],
          }),
        },
        children: sectionChildren,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
