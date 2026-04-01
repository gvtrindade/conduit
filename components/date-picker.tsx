'use client';

import { useState, useRef } from 'react';
import { formatDbDate, parseFormattedDate } from '../lib/date';
import { useDropdownPosition } from '../lib/hooks/use-dropdown-position';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  min?: string;
  max?: string;
}

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

function generateYearOptions(minYear: number, maxYear: number): number[] {
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push(y);
  }
  return years;
}

export function DatePicker({ value, onChange, min, max }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseFormattedDate(value);
    return d ? d.getUTCMonth() : new Date().getUTCMonth();
  });
  const [viewYear, setViewYear] = useState(() => {
    const d = parseFormattedDate(value);
    return d ? d.getUTCFullYear() : new Date().getUTCFullYear();
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { position: dropdownPosition, maxHeight } = useDropdownPosition({
    triggerRef,
    dropdownRef,
    dropdownHeight: 300, // approximate height of calendar dropdown
    offset: 8,
  });

  const dropdownClassName = dropdownPosition === 'above'
    ? 'absolute z-50 mb-1 bg-panel border border-border-custom shadow-lg min-w-[280px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-x-auto overflow-y-auto bottom-full'
    : 'absolute z-50 mt-1 bg-panel border border-border-custom shadow-lg min-w-[280px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-x-auto overflow-y-auto';

  const minDate = min ? parseFormattedDate(min) : null;
  const maxDate = max ? parseFormattedDate(max) : null;
  const yearOptions = generateYearOptions(
    minDate ? minDate.getUTCFullYear() : 2000,
    maxDate ? maxDate.getUTCFullYear() : 2099,
  );

  function handleDateSelect(dateStr: string) {
    onChange(dateStr);
    setIsOpen(false);
  }

  function handleMonthChange(monthIdx: number) {
    setViewMonth(monthIdx);
  }

  function handleYearChange(year: number) {
    setViewYear(year);
  }

  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
  const firstDayOfWeek = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  function isDateDisabled(day: number): boolean {
    const date = new Date(Date.UTC(viewYear, viewMonth, day));
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }

  function isDateSelected(day: number): boolean {
    const selected = parseFormattedDate(value);
    if (!selected) return false;
    return (
      selected.getUTCFullYear() === viewYear &&
      selected.getUTCMonth() === viewMonth &&
      selected.getUTCDate() === day
    );
  }

  return (
    <div className="relative font-mono">
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-panel border border-border-custom text-cream font-mono text-[10px] tracking-[0.15em] uppercase px-3 py-2 text-left hover:border-amber/50 focus:outline-none focus:border-amber"
      >
        {value || 'SELECT_DATE'}
      </button>

      {isOpen && (
        <div ref={dropdownRef} className={dropdownClassName} data-testid="datepicker-dropdown" style={maxHeight !== undefined ? { maxHeight: `${maxHeight}px` } : undefined}>
          <div className="p-2 border-b border-border-custom flex items-center gap-2">
            <select
              value={viewMonth}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="flex-1 bg-panel2 border border-border-custom text-cream font-mono text-[10px] tracking-[0.12em] uppercase px-2 py-1 focus:outline-none focus:border-amber"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
            <select
              value={viewYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="flex-1 bg-panel2 border border-border-custom text-cream font-mono text-[10px] tracking-[0.12em] uppercase px-2 py-1 focus:outline-none focus:border-amber"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="p-2">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d) => (
                <div key={d} className="text-center text-sand font-mono text-[8px] tracking-[0.12em] uppercase py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => (
                day === null ? (
                  <div key={`empty-${idx}`} />
                ) : (
                  <button
                    key={day}
                    type="button"
                    disabled={isDateDisabled(day)}
                    onClick={() => {
                      const dateStr = formatDbDate(
                        new Date(Date.UTC(viewYear, viewMonth, day)).toISOString()
                      );
                      handleDateSelect(dateStr);
                    }}
                    className={`
                      font-mono text-[10px] tracking-wider py-1.5 rounded-sm
                      ${isDateSelected(day)
                        ? 'bg-amber text-hull font-bold'
                        : isDateDisabled(day)
                          ? 'text-sand/30 cursor-not-allowed'
                          : 'text-cream hover:bg-panel2 hover:border-amber/30 border border-transparent'
                      }
                    `}
                  >
                    {String(day).padStart(2, '0')}
                  </button>
                )
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
