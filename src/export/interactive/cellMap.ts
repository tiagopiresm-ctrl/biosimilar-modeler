// ──────────────────────────────────────────────────────────────
// CellMap — Cell address registry for interactive Excel formulas
// ──────────────────────────────────────────────────────────────

export interface CellRef {
  sheet: string;
  cell: string;
  /** Cross-sheet reference: "'Sheet Name'!B5" */
  toFormula(): string;
  /** Same-sheet reference: "B5" */
  toLocal(): string;
}

function quoteSheet(name: string): string {
  // Excel requires single quotes around sheet names with spaces or special chars
  if (/^[A-Za-z_]\w*$/.test(name)) return name;
  return `'${name.replace(/'/g, "''")}'`;
}

function makeCellRef(sheet: string, cell: string): CellRef {
  return {
    sheet,
    cell,
    toFormula: () => `${quoteSheet(sheet)}!${cell}`,
    toLocal: () => cell,
  };
}

/**
 * Registry that tracks the Excel cell address for every input and
 * computed value. Sheet builders register addresses as they write
 * cells; formula builders read them to construct formula strings.
 */
export class CellMap {
  private map = new Map<string, { sheet: string; cell: string }>();

  // ── Period-indexed values ──

  register(sheetKey: string, field: string, periodIndex: number, sheet: string, cell: string): void {
    this.map.set(`${sheetKey}::${field}::${periodIndex}`, { sheet, cell });
  }

  get(sheetKey: string, field: string, periodIndex: number): CellRef {
    const key = `${sheetKey}::${field}::${periodIndex}`;
    const entry = this.map.get(key);
    if (!entry) throw new Error(`CellMap: missing key "${key}"`);
    return makeCellRef(entry.sheet, entry.cell);
  }

  has(sheetKey: string, field: string, periodIndex: number): boolean {
    return this.map.has(`${sheetKey}::${field}::${periodIndex}`);
  }

  // ── Scalar values (not period-indexed) ──

  registerScalar(sheetKey: string, field: string, sheet: string, cell: string): void {
    this.map.set(`${sheetKey}::${field}`, { sheet, cell });
  }

  getScalar(sheetKey: string, field: string): CellRef {
    const key = `${sheetKey}::${field}`;
    const entry = this.map.get(key);
    if (!entry) throw new Error(`CellMap: missing scalar key "${key}"`);
    return makeCellRef(entry.sheet, entry.cell);
  }

  // ── Scenario-indexed values (index 0/1/2 = worst/base/best) ──

  registerScenario(sheetKey: string, field: string, scenarioIndex: number, sheet: string, cell: string): void {
    this.map.set(`${sheetKey}::${field}::s${scenarioIndex}`, { sheet, cell });
  }

  getScenario(sheetKey: string, field: string, scenarioIndex: number): CellRef {
    const key = `${sheetKey}::${field}::s${scenarioIndex}`;
    const entry = this.map.get(key);
    if (!entry) throw new Error(`CellMap: missing scenario key "${key}"`);
    return makeCellRef(entry.sheet, entry.cell);
  }
}
