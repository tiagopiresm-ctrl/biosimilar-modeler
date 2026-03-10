// ──────────────────────────────────────────────────────────────
// Shared Excel styling constants for ExcelJS
// ──────────────────────────────────────────────────────────────

import type { Fill, Font, Border, Alignment } from 'exceljs';

// ---- Colors ----
export const COLORS = {
  darkBlue: '1F3864',
  mediumBlue: '2E75B6',
  lightBlue: 'D6E4F0',
  white: 'FFFFFF',
  lightGray: 'F2F2F2',
  mediumGray: 'D9D9D9',
  darkGray: '404040',
  green: '548235',
  red: 'C00000',
};

// ---- Fills ----
export const HEADER_FILL: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: COLORS.darkBlue },
};

export const SECTION_FILL: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: COLORS.lightBlue },
};

export const ALT_ROW_FILL: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: COLORS.lightGray },
};

// ---- Fonts ----
export const HEADER_FONT: Partial<Font> = {
  name: 'Calibri',
  size: 10,
  bold: true,
  color: { argb: COLORS.white },
};

export const SECTION_FONT: Partial<Font> = {
  name: 'Calibri',
  size: 10,
  bold: true,
  color: { argb: COLORS.darkBlue },
};

export const LABEL_FONT: Partial<Font> = {
  name: 'Calibri',
  size: 10,
  bold: false,
  color: { argb: COLORS.darkGray },
};

export const VALUE_FONT: Partial<Font> = {
  name: 'Calibri',
  size: 10,
  bold: false,
};

export const BOLD_VALUE_FONT: Partial<Font> = {
  name: 'Calibri',
  size: 10,
  bold: true,
};

// ---- Borders ----
export const THIN_BORDER: Partial<Border> = {
  style: 'thin',
  color: { argb: COLORS.mediumGray },
};

export const BOTTOM_BORDER: Partial<import('exceljs').Borders> = {
  bottom: THIN_BORDER,
};

// ---- Alignment ----
export const RIGHT_ALIGN: Partial<Alignment> = { horizontal: 'right' };
export const CENTER_ALIGN: Partial<Alignment> = { horizontal: 'center' };
export const LEFT_ALIGN: Partial<Alignment> = { horizontal: 'left' };

// ---- Number Formats ----
export const NUM_FMT = {
  integer: '#,##0',
  decimal1: '#,##0.0',
  decimal2: '#,##0.00',
  percent: '0.0%',
  percentInt: '0%',
  year: '0',
};

/** Build a currency number format string. */
export function currencyFormat(currency: string, decimals: number = 0): string {
  const dec = decimals > 0 ? '.' + '0'.repeat(decimals) : '';
  return `"${currency} "#,##0${dec}`;
}

// ---- Utility: apply header style to a row ----
export function styleHeaderRow(row: import('exceljs').Row, colCount: number): void {
  row.font = HEADER_FONT;
  row.fill = HEADER_FILL;
  row.alignment = CENTER_ALIGN;
  for (let c = 1; c <= colCount; c++) {
    row.getCell(c).border = { bottom: THIN_BORDER };
  }
}

/** Apply section sub-header style. */
export function styleSectionRow(row: import('exceljs').Row, colCount: number): void {
  row.font = SECTION_FONT;
  row.fill = SECTION_FILL;
  for (let c = 1; c <= colCount; c++) {
    row.getCell(c).border = { bottom: THIN_BORDER };
  }
}

/** Auto-fit column widths (approximate). */
export function autoFitColumns(ws: import('exceljs').Worksheet, minWidth: number = 12, maxWidth: number = 25): void {
  ws.columns.forEach((col) => {
    let max = minWidth;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value ? String(cell.value).length + 2 : 0;
      if (len > max) max = len;
    });
    col.width = Math.min(max, maxWidth);
  });
}
