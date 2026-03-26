// ──────────────────────────────────────────────────────────────
// Shared slide layout helpers — Molecule Assessment Report template
// Matches Mabxience BI PowerPoint template style.
// ──────────────────────────────────────────────────────────────

import type PptxGenJS from 'pptxgenjs';

// ── Template colour palette ─────────────────────────────────
export const DARK_BLUE  = '1F4E79';
export const ACCENT_BLUE = 'D6E4F0';
export const MID_BLUE   = '2E75B6';
export const WHITE      = 'FFFFFF';
export const BLACK      = '000000';
export const GRAY       = '808080';
export const LIGHT_GRAY = 'F2F2F2';
export const BORDER_GRAY = 'D9D9D9';
export const FOOTER_GRAY = 'BFBFBF';

// ── Dimensions (inches, widescreen 16:9 @ 10" x 5.63") ─────
export const SLIDE_W = 10;
export const SLIDE_H = 5.63;
export const HEADER_H = 0.64;       // ~777240 EMU / 914400
export const ACCENT_LINE_H = 0.02;
export const FOOTER_H = 0.3;
export const CONTENT_TOP = HEADER_H + ACCENT_LINE_H + 0.12;
export const CONTENT_BOTTOM = SLIDE_H - FOOTER_H - 0.08;
export const MARGIN_X = 0.35;
export const CONTENT_W = SLIDE_W - 2 * MARGIN_X;

// ── Fonts ───────────────────────────────────────────────────
export const FONT = 'Calibri';

/**
 * Apply the template chrome to a slide:
 *  1. Dark-blue header bar with white title
 *  2. Thin accent line below header
 *  3. Gray footer bar with company text
 */
export function applyLayout(
  slide: PptxGenJS.Slide,
  title: string,
): void {
  // Header bar
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: HEADER_H,
    fill: { color: DARK_BLUE },
  });

  // Title text inside header
  slide.addText(title, {
    x: MARGIN_X, y: 0.1, w: CONTENT_W, h: HEADER_H - 0.2,
    fontSize: 18, fontFace: FONT, bold: true, color: WHITE,
    valign: 'middle',
  });

  // Accent line below header
  slide.addShape('rect', {
    x: 0, y: HEADER_H, w: '100%', h: ACCENT_LINE_H,
    fill: { color: MID_BLUE },
  });

  // Footer bar
  slide.addShape('rect', {
    x: 0, y: SLIDE_H - FOOTER_H, w: '100%', h: FOOTER_H,
    fill: { color: LIGHT_GRAY },
  });

  slide.addText('Mabxience  |  Business Intelligence  |  Confidential', {
    x: MARGIN_X,
    y: SLIDE_H - FOOTER_H + 0.04,
    w: CONTENT_W,
    h: FOOTER_H - 0.08,
    fontSize: 7, fontFace: FONT, italic: true, color: GRAY,
    valign: 'middle',
  });
}

// ── Reusable section-box (light blue rounded rect with title) ─
export function addSectionBox(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number, h: number,
  label: string,
): void {
  slide.addShape('roundRect', {
    x, y, w, h,
    fill: { color: ACCENT_BLUE },
    rectRadius: 0.06,
  });
  slide.addText(label, {
    x: x + 0.08, y: y + 0.04, w: w - 0.16, h: 0.22,
    fontSize: 9, fontFace: FONT, bold: true, color: DARK_BLUE,
  });
}

// ── Reusable label/value pair (left-aligned label, right-aligned value) ─
export function addLabelValue(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number,
  label: string, value: string,
  opts?: { fontSize?: number; bold?: boolean },
): void {
  const fs = opts?.fontSize ?? 8;
  const halfW = w / 2;
  slide.addText(label, {
    x, y, w: halfW, h: 0.18,
    fontSize: fs, fontFace: FONT, color: GRAY,
  });
  slide.addText(value, {
    x: x + halfW, y, w: halfW, h: 0.18,
    fontSize: fs, fontFace: FONT, bold: opts?.bold ?? true, color: BLACK,
    align: 'right',
  });
}

// ── Standard table header style ────────────────────────────
export const TABLE_HDR = {
  bold: true as const,
  fontSize: 7.5,
  fill: { color: DARK_BLUE },
  color: WHITE,
  fontFace: FONT,
};

export const TABLE_HDR_R = { ...TABLE_HDR, align: 'right' as const };
export const TABLE_HDR_C = { ...TABLE_HDR, align: 'center' as const };

export function tableCellOpts(rowIdx: number, align: 'left' | 'right' | 'center' = 'left', bold = false) {
  return {
    fontSize: 7.5,
    fontFace: FONT,
    color: BLACK,
    align,
    bold,
    ...(rowIdx % 2 === 1 ? { fill: { color: LIGHT_GRAY } } : {}),
  };
}

// ── KPI card ───────────────────────────────────────────────
export function addKpiCard(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number, h: number,
  label: string, value: string,
): void {
  slide.addShape('roundRect', {
    x, y, w, h,
    fill: { color: ACCENT_BLUE },
    rectRadius: 0.06,
  });
  slide.addText(label, {
    x, y: y + 0.06, w, h: 0.2,
    fontSize: 7, fontFace: FONT, color: DARK_BLUE, align: 'center',
  });
  slide.addText(value, {
    x, y: y + 0.28, w, h: h - 0.34,
    fontSize: 13, fontFace: FONT, bold: true, color: DARK_BLUE,
    align: 'center', shrinkText: true,
  });
}
