// ──────────────────────────────────────────────────────────────
// Shared slide layout helpers — Molecule Assessment Report template
//
// Pixel-perfect match to the Mabxience BI PowerPoint template.
// All measurements extracted from Molecule_Assessment_Report.pptx.
//
// Template slide size: 12 191 675 x 6 858 000 EMU  (13.333 x 7.5 in)
// ──────────────────────────────────────────────────────────────

import type PptxGenJS from 'pptxgenjs';

// ── Template colour palette (extracted from template XML) ────
export const NAVY       = '003366';   // header bar, footer bar, accent
export const DARK_BLUE  = '1F4E79';   // legacy alias — avoid in new code
export const TEAL_BLUE  = '1A5C8A';   // vertical bar, subtitle, some bars
export const MID_BLUE   = '2E75B6';   // legacy compat
export const SKY_BLUE   = '5B9BD5';   // secondary chart colour
export const LIGHT_SKY  = '7FBFDB';   // tertiary chart colour
export const PALE_BLUE  = 'B8CCE4';   // accent line, quaternary chart
export const SECTION_BG = 'E8EFF5';   // section header box fill
export const ACCENT_BLUE = 'D6E4F0';  // legacy alias for KPI cards
export const TEAL       = '17A2B8';   // chart accent
export const GREEN      = '28A745';   // go/proceed badge
export const YELLOW_BG  = 'FFFFE0';   // caution banner
export const WHITE      = 'FFFFFF';
export const BLACK      = '000000';
export const LABEL_NAVY = '003366';   // label text colour
export const VALUE_GRAY = '333333';   // value text colour
export const GRAY       = '666666';   // footnote / muted
export const LIGHT_GRAY = 'F2F2F2';   // row stripe
export const BORDER_GRAY = 'D9D9D9';
export const FOOTER_GRAY = 'BFBFBF';

// ── Dimensions (inches) — 16:9 widescreen ────────────────────
// Template EMU: 12 191 675 x 6 858 000
export const SLIDE_W = 13.333;
export const SLIDE_H = 7.5;

// Header bar: y=0, h=0.85"
export const HEADER_H = 0.85;
// Accent line: y=0.85", h=0.04"
export const ACCENT_LINE_H = 0.04;
// Subtitle line: y ~0.92"
export const SUBTITLE_Y = 0.92;
// Content starts at y ~1.15"
export const CONTENT_TOP = 1.15;

// Footer bar: y=7.05", h=0.45"
export const FOOTER_Y = 7.05;
export const FOOTER_H = 0.45;

// Horizontal margins
export const MARGIN_X = 0.60;
export const CONTENT_W = SLIDE_W - 2 * MARGIN_X;  // ~12.133"

// ── Fonts ────────────────────────────────────────────────────
export const FONT = 'Calibri';

// Font sizes (pt) from template
export const FS_TITLE    = 28;   // header title
export const FS_SECTION  = 14;   // section header label
export const FS_SUBTITLE =  9;   // subtitle / footer
export const FS_LABEL    =  9;   // label:  bold #003366
export const FS_VALUE    =  9;   // value:  regular #333333
export const FS_SMALL    =  8;   // KPI label / smaller items
export const FS_MINI     =  7;   // chart sub-header / small bar labels
export const FS_FOOTNOTE =  6;   // footnote row
export const FS_TABLE    =  8;   // table cell default
export const FS_KPI_VAL  = 10;   // KPI big value (e.g. "Program costs: $135M")

/**
 * Apply the standard template chrome to a slide:
 *  1. Dark navy header bar (0.85") with 28pt bold white title
 *  2. Pale-blue accent line (0.04") below header
 *  3. Navy footer bar (0.45") at bottom with italic white text
 */
export function applyLayout(
  slide: PptxGenJS.Slide,
  title: string,
  subtitle?: string,
): void {
  // ── Header bar ────────────────────────────────────────────
  slide.addShape('rect', {
    x: 0, y: 0, w: SLIDE_W, h: HEADER_H,
    fill: { color: NAVY },
  });

  // Title text inside header (x=0.60", y=0.15", 28pt bold white)
  slide.addText(title, {
    x: MARGIN_X, y: 0.15, w: CONTENT_W, h: 0.60,
    fontSize: FS_TITLE, fontFace: FONT, bold: true, color: WHITE,
    valign: 'middle',
  });

  // ── Accent line ───────────────────────────────────────────
  slide.addShape('rect', {
    x: 0, y: HEADER_H, w: SLIDE_W, h: ACCENT_LINE_H,
    fill: { color: PALE_BLUE },
  });

  // ── Subtitle (optional) ───────────────────────────────────
  if (subtitle) {
    slide.addText(subtitle, {
      x: MARGIN_X, y: SUBTITLE_Y, w: CONTENT_W, h: 0.20,
      fontSize: FS_SUBTITLE, fontFace: FONT, italic: true, color: TEAL_BLUE,
    });
  }

  // ── Footer bar ────────────────────────────────────────────
  slide.addShape('rect', {
    x: 0, y: FOOTER_Y, w: SLIDE_W, h: FOOTER_H,
    fill: { color: NAVY },
  });

  slide.addText('Mabxience  |  Business Intelligence  |  Confidential', {
    x: 0.50, y: FOOTER_Y + 0.03, w: SLIDE_W - 1.0, h: FOOTER_H - 0.06,
    fontSize: FS_SUBTITLE, fontFace: FONT, italic: true, color: WHITE,
    valign: 'middle',
  });
}

// ── Footnote (above footer) ──────────────────────────────────
export function addFootnote(
  slide: PptxGenJS.Slide,
  text: string,
): void {
  slide.addText(text, {
    x: MARGIN_X, y: FOOTER_Y - 0.20, w: CONTENT_W, h: 0.15,
    fontSize: FS_FOOTNOTE, fontFace: FONT, italic: true, color: GRAY,
  });
}

// ── Section header box (light blue rounded rect with title) ──
export function addSectionBox(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number, h: number,
  label: string,
): void {
  // Background box
  slide.addShape('roundRect', {
    x, y, w, h,
    fill: { color: SECTION_BG },
    rectRadius: 0.04,
  });
  // Label text (14pt bold #003366)
  slide.addText(label, {
    x: x + 0.15, y: y + 0.02, w: w - 0.30, h,
    fontSize: FS_SECTION, fontFace: FONT, bold: true, color: LABEL_NAVY,
    valign: 'middle',
  });
}

// ── Vertical accent bar (thin navy stripe) ───────────────────
export function addVerticalAccent(
  slide: PptxGenJS.Slide,
  x: number, y: number, h: number,
): void {
  slide.addShape('rect', {
    x, y, w: 0.04, h,
    fill: { color: TEAL_BLUE },
  });
}

// ── Label / Value pair ───────────────────────────────────────
// Label: 9pt bold #003366  |  Value: 9pt regular #333333
export function addLabelValue(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number,
  label: string, value: string,
  opts?: { fontSize?: number; bold?: boolean; labelW?: number },
): void {
  const fs = opts?.fontSize ?? FS_LABEL;
  const labelW = opts?.labelW ?? w * 0.5;
  const valW = w - labelW;

  slide.addText(label, {
    x, y, w: labelW, h: 0.26,
    fontSize: fs, fontFace: FONT, bold: true, color: LABEL_NAVY,
    valign: 'middle',
  });
  slide.addText(value, {
    x: x + labelW, y, w: valW, h: 0.26,
    fontSize: fs, fontFace: FONT, bold: opts?.bold ?? false, color: VALUE_GRAY,
    valign: 'middle',
  });
}

// ── Standard table styles ────────────────────────────────────
export const TABLE_HDR = {
  bold: true as const,
  fontSize: FS_TABLE,
  fill: { color: NAVY },
  color: WHITE,
  fontFace: FONT,
};

export const TABLE_HDR_R = { ...TABLE_HDR, align: 'right' as const };
export const TABLE_HDR_C = { ...TABLE_HDR, align: 'center' as const };

export function tableCellOpts(
  rowIdx: number,
  align: 'left' | 'right' | 'center' = 'left',
  bold = false,
) {
  return {
    fontSize: FS_TABLE,
    fontFace: FONT,
    color: VALUE_GRAY,
    align,
    bold,
    ...(rowIdx % 2 === 1 ? { fill: { color: LIGHT_GRAY } } : {}),
  };
}

// ── KPI card (small highlight box) ───────────────────────────
export function addKpiCard(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number, h: number,
  label: string, value: string,
): void {
  slide.addShape('roundRect', {
    x, y, w, h,
    fill: { color: SECTION_BG },
    rectRadius: 0.06,
  });
  slide.addText(label, {
    x, y: y + 0.06, w, h: 0.22,
    fontSize: FS_MINI, fontFace: FONT, bold: true, color: LABEL_NAVY,
    align: 'center',
  });
  slide.addText(value, {
    x, y: y + 0.30, w, h: h - 0.36,
    fontSize: FS_KPI_VAL, fontFace: FONT, bold: true, color: TEAL_BLUE,
    align: 'center', shrinkText: true,
  });
}
