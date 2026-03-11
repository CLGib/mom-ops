/**
 * Mom Ops document brand tokens.
 * Matches the seed spec in va_toolbox_seed (Mom Ops Branded Document Generator).
 */

export const BRAND_COLORS = {
  gold: "B8860B",
  dark: "1A1917",
  muted: "5C5955",
  soft: "8A8681",
  bg: "FAF9F7",
  bgAlt: "F2F0EC",
  border: "E8E6E2",
  accentSoftBg: "F8F5ED",
  sage: "6B7C5E",
  successBg: "F0F4ED",
  error: "B91C1C",
  white: "FFFFFF",
} as const;

export const BRAND_FONTS = {
  heading: "Georgia",
  body: "Arial",
} as const;

/** Font sizes in half-points (e.g. 24pt = 48 half-pts) */
export const BRAND_FONT_SIZES = {
  h1: 48,
  h2: 36,
  h3: 26,
  body: 22,
  caption: 18,
  tableHeader: 20,
  tableBody: 20,
  headerFooter: 16, // 8pt
  confidential: 18, // 9pt
} as const;

/** Spacing in DXA (twips); 1440 DXA = 1 inch */
export const BRAND_SPACING = {
  afterH1: 360,
  beforeH2: 480,
  afterH2: 240,
  beforeH3: 360,
  afterH3: 160,
  bodyLineSpacing: 276, // 1.15 line
  bodyAfter: 160,
  ruleBeforeAfter: 240,
  cellMarginTopBottom: 80,
  cellMarginLeftRight: 120,
  marginInch: 1440,
  contentWidth: 9360, // US Letter minus 1" margins each side
} as const;

export const PAGE_SIZE = {
  width: 12240, // US Letter width DXA
  height: 15840, // US Letter height DXA
} as const;
