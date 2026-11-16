import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BULAN_ID, formatDateId, getTodayDateKey } from '../constants/defaults';

interface IndonesianDateInputProps {
  value: string; // YYYY-MM-DD
  onChange: (dateKey: string) => void;
  disabled?: boolean;
  disabledText?: string;
  className?: string;
  compact?: boolean;
}

const WEEKDAYS = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg'];

function parseDateParts(dateKey: string): { year: number; month: number; day: number } | null {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m - 1, day: d };
}

export function IndonesianDateInput({
  value,
  onChange,
  disabled = false,
  disabledText = 'BELUM LAYOUT',
  className = '',
  compact = false,
}: IndonesianDateInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [textVal, setTextVal] = useState(value ? formatDateId(value) : '');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const todayKey = getTodayDateKey();
  const initialDate = parseDateParts(value) || parseDateParts(todayKey)!;
  const [viewYear, setViewYear] = useState(initialDate.year);
  const [viewMonth, setViewMonth] = useState(initialDate.month);

  useEffect(() => {
    setTextVal(value ? formatDateId(value) : '');
    const parsed = parseDateParts(value);
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [value]);

  useEffect(() => {
    if (disabled && pickerOpen) {
      setPickerOpen(false);
    }
  }, [disabled, pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setPickerOpen(false);
      }
    };
    const handleScrollOrResize = () => {
      setPickerOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [pickerOpen]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: Array<{ dateKey: string | null; day: number | null }> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ dateKey: null, day: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dk = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateKey: dk, day: d });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ dateKey: null, day: null });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const handleTextChange = (raw: string) => {
    setTextVal(raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange('');
      return;
    }
    const match = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      const d = Number(dd);
      const m = Number(mm);
      const y = Number(yyyy);
      const dt = new Date(y, m - 1, d);
      if (
        dt.getFullYear() === y &&
        dt.getMonth() === m - 1 &&
        dt.getDate() === d
      ) {
        onChange(`${yyyy}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      }
    }
  };

  const togglePicker = () => {
    if (disabled) return;
    if (!pickerOpen && containerRef.current) {
      const parsed = parseDateParts(value) || parseDateParts(todayKey)!;
      setViewYear(parsed.year);
      setViewMonth(parsed.month);

      const rect = containerRef.current.getBoundingClientRect();
      const popoverW = 256;
      const popoverH = 295;
      const left = Math.max(8, Math.min(rect.right - popoverW, window.innerWidth - popoverW - 8));
      const spaceBelow = window.innerHeight - rect.bottom;
      const top =
        spaceBelow >= popoverH || rect.top < popoverH
          ? rect.bottom + 6
          : Math.max(8, rect.top - popoverH - 6);
      setCoords({ top, left });
    }
    setPickerOpen((prev) => !prev);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div ref={containerRef} className={`relative flex items-center ${className}`}>
      <input
        type="text"
        disabled={disabled}
        value={disabled ? disabledText : textVal}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="HH/BB/TTTT"
        className={`w-full rounded-lg border font-mono tabular-nums focus:outline-none ${
          compact ? 'px-2 py-1 pr-7 text-xs' : 'px-3 py-2 pr-9 text-sm'
        } ${
          disabled
            ? 'border-slate-200 bg-slate-100 text-slate-500 font-sans font-medium'
            : 'border-slate-300 bg-white text-slate-900 focus:border-blue-600'
        }`}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={togglePicker}
        aria-label="Pilih tanggal"
        title="Buka kalender tanggal"
        className="absolute right-1.5 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-40 cursor-pointer"
      >
        <Calendar className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>

      {pickerOpen && !disabled && (
        <div
          ref={popoverRef}
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-[100] w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
        >
          <div className="mb-2 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Bulan sebelumnya"
              className="rounded-md p-1 text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-xs font-bold text-slate-900">
              {BULAN_ID[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Bulan berikutnya"
              className="rounded-md p-1 text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-slate-400 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((cell, idx) => {
              if (!cell.dateKey || !cell.day) {
                return <div key={`empty-${idx}`} className="h-7" />;
              }
              const isSelected = cell.dateKey === value;
              const isToday = cell.dateKey === todayKey;
              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => {
                    onChange(cell.dateKey!);
                    setPickerOpen(false);
                  }}
                  className={`h-7 rounded-md font-mono text-xs tabular-nums transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 font-bold text-white'
                      : isToday
                        ? 'border border-blue-300 bg-blue-50 font-semibold text-blue-700'
                        : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => {
                onChange(todayKey);
                setPickerOpen(false);
              }}
              className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Hari Ini ({formatDateId(todayKey)})
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setPickerOpen(false);
                }}
                className="text-[11px] font-medium text-slate-500 hover:text-red-600 cursor-pointer"
              >
                Kosongkan
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
