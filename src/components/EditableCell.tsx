import { useState, useRef, useEffect, useCallback } from 'react';

// ---- Paste helper ----
// Parse a single clipboard token into a number, respecting format
function parsePasteValue(text: string, format: string): number {
  // Strip common formatting characters: commas, %, currency symbols, whitespace
  const cleaned = text.replace(/[,%€$£¥\s]/g, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return NaN;
  // Percent fields: user pastes "50" meaning 50% → store as 0.50
  return format === 'percent' ? num / 100 : num;
}

interface EditableCellProps {
  value: number;
  onChange: (value: number) => void;
  onPasteRange?: (values: number[]) => void; // called with remaining values when multi-cell paste
  format?: 'number' | 'percent' | 'currency';
  decimals?: number;
  className?: string;
  disabled?: boolean;
}

export function EditableCell({ value, onChange, onPasteRange, format = 'number', decimals = 1, className = '', disabled = false }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const displayValue = useCallback(() => {
    if (format === 'percent') {
      return (value * 100).toFixed(decimals) + '%';
    }
    if (format === 'currency') {
      return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }
    return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }, [value, format, decimals]);

  const handleClick = () => {
    if (disabled) return;
    setEditing(true);
    // Clear the value so user can immediately type a new one
    setEditValue('');
  };

  const handleDoubleClick = () => {
    if (disabled) return;
    setEditing(true);
    // Double-click: keep the existing value for fine-tuning
    if (format === 'percent') {
      setEditValue((value * 100).toFixed(decimals));
    } else {
      setEditValue(value.toString());
    }
  };

  const handleBlur = () => {
    setEditing(false);
    // If empty (user clicked but didn't type), keep original value
    if (editValue.trim() === '') return;
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      if (format === 'percent') {
        onChange(parsed / 100);
      } else {
        onChange(parsed);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  // Shared paste handler for both display-mode div and edit-mode input
  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;

    // Take only the first row (split by newline)
    const firstRow = text.split(/[\r\n]+/)[0] ?? '';
    // Split by tab to get individual cell values
    const tokens = firstRow.split('\t');

    if (tokens.length <= 1) {
      // Single value paste — set this cell only
      const parsed = parsePasteValue(tokens[0] ?? text, format);
      if (!isNaN(parsed)) {
        onChange(parsed);
        setEditing(false);
      }
    } else {
      // Multi-cell paste — first value goes to this cell, rest via onPasteRange
      const parsed = tokens.map((t) => parsePasteValue(t, format));
      const first = parsed[0];
      if (!isNaN(first)) onChange(first);
      // Pass remaining valid values to the parent grid for distribution
      if (onPasteRange && parsed.length > 1) {
        onPasteRange(parsed.slice(1));
      }
      setEditing(false);
    }
    e.preventDefault();
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className="input-cell w-full"
      />
    );
  }

  return (
    <div
      tabIndex={disabled ? undefined : 0}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPaste={handlePaste}
      className={`input-cell select-none cursor-pointer ${disabled ? 'opacity-50 !cursor-default' : ''} ${className}`}
      title={disabled ? 'Read-only' : 'Click to replace · Double-click to edit · Paste from Excel'}
    >
      {displayValue()}
    </div>
  );
}

// Read-only formula cell
interface FormulaCellProps {
  value: number;
  format?: 'number' | 'percent' | 'currency';
  decimals?: number;
  className?: string;
  highlight?: boolean;
}

export function FormulaCell({ value, format = 'number', decimals = 1, className = '', highlight = false }: FormulaCellProps) {
  const displayValue = () => {
    if (value === null || value === undefined || isNaN(value)) return '—';
    if (format === 'percent') {
      return (value * 100).toFixed(decimals) + '%';
    }
    return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const colorClass = highlight
    ? value > 0 ? 'text-green-700 font-semibold' : value < 0 ? 'text-red-600 font-semibold' : ''
    : '';

  return (
    <div className={`formula-cell ${colorClass} ${className}`}>
      {displayValue()}
    </div>
  );
}
