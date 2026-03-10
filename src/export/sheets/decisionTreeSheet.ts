// Decision Tree sheet — gates + summary outputs

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../exportTypes';
import {
  styleHeaderRow,
  LABEL_FONT, BOLD_VALUE_FONT, VALUE_FONT,
  NUM_FMT, SECTION_FILL, SECTION_FONT, THIN_BORDER,
} from '../excelStyles';
import { formatCurrency, formatPercent } from '../../calculations';

export function addDecisionTreeSheet(wb: Workbook, ctx: ExportContext): void {
  const ws = wb.addWorksheet('Decision Tree');
  const { decisionTree, dtOutputs, npvOutputs, config } = ctx;

  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 35;

  // ---- Gates table ----
  const headerRow = ws.addRow(['Gate', 'Probability', 'Description']);
  styleHeaderRow(headerRow, 3);

  if (decisionTree.length === 0) {
    const row = ws.addRow(['No gates defined', '', '']);
    row.getCell(1).font = LABEL_FONT;
  } else {
    for (const gate of decisionTree) {
      const row = ws.addRow([gate.name, gate.probability, gate.description]);
      row.getCell(1).font = LABEL_FONT;
      row.getCell(2).numFmt = NUM_FMT.percent;
      row.getCell(2).font = VALUE_FONT;
      row.getCell(3).font = VALUE_FONT;
    }
  }

  ws.addRow([]);
  ws.addRow([]);

  // ---- Summary outputs ----
  const secRow = ws.addRow(['Summary', 'Value', '']);
  secRow.font = SECTION_FONT;
  secRow.fill = SECTION_FILL;
  secRow.getCell(1).border = { bottom: THIN_BORDER };
  secRow.getCell(2).border = { bottom: THIN_BORDER };

  const addKPI = (label: string, value: string) => {
    const r = ws.addRow([label, value, '']);
    r.getCell(1).font = LABEL_FONT;
    r.getCell(2).font = BOLD_VALUE_FONT;
  };

  addKPI('Cumulative Probability of Success', formatPercent(dtOutputs.cumulativePoS));
  addKPI('NPV', formatCurrency(npvOutputs.npv, config.currency));
  addKPI('rNPV', formatCurrency(npvOutputs.rnpv, config.currency));
  addKPI('ENPV', formatCurrency(dtOutputs.enpv, config.currency));
  addKPI('ENPV from rNPV', formatCurrency(dtOutputs.enpvFromRnpv, config.currency));
}
