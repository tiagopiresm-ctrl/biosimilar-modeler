// Excel & PowerPoint export buttons for the sidebar

import { useState } from 'react';
import { FileSpreadsheet, Presentation } from 'lucide-react';
import { useStore } from '../store';
import { buildExportContext } from './exportTypes';
import { exportToExcel } from './exportExcel';
import { exportToPowerPoint } from './exportPowerPoint';

export function ExportButtons() {
  const [excelBusy, setExcelBusy] = useState(false);
  const [pptxBusy, setPptxBusy] = useState(false);

  const handleExcel = async () => {
    setExcelBusy(true);
    try {
      const state = useStore.getState();
      const ctx = buildExportContext(state);
      await exportToExcel(ctx);
    } catch (err) {
      console.error('Excel export failed', err);
      alert('Excel export failed — see console for details.');
    } finally {
      setExcelBusy(false);
    }
  };

  const handlePptx = async () => {
    setPptxBusy(true);
    try {
      const state = useStore.getState();
      const ctx = buildExportContext(state);
      await exportToPowerPoint(ctx);
    } catch (err) {
      console.error('PowerPoint export failed', err);
      alert('PowerPoint export failed — see console for details.');
    } finally {
      setPptxBusy(false);
    }
  };

  return (
    <div className="flex gap-1.5">
      <button
        onClick={handleExcel}
        disabled={excelBusy}
        className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        title="Export as Excel workbook"
      >
        <FileSpreadsheet size={12} />
        {excelBusy ? 'Exporting…' : 'Excel'}
      </button>
      <button
        onClick={handlePptx}
        disabled={pptxBusy}
        className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 transition-colors"
        title="Export as PowerPoint presentation"
      >
        <Presentation size={12} />
        {pptxBusy ? 'Exporting…' : 'PowerPoint'}
      </button>
    </div>
  );
}
