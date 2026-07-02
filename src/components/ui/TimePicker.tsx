'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value: string; // HH:mm (24-hour)
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  className?: string;
  disabled?: boolean;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function parse24(s: string): { h: number; m: number } | null {
  if (!s || !s.includes(':')) return null;
  const [hStr, mStr] = s.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return null;
  return { h, m };
}

function to12(h24: number): { h12: number; period: 'AM' | 'PM' } {
  if (h24 === 0) return { h12: 12, period: 'AM' };
  if (h24 < 12) return { h12: h24, period: 'AM' };
  if (h24 === 12) return { h12: 12, period: 'PM' };
  return { h12: h24 - 12, period: 'PM' };
}

function to24(h12: number, period: 'AM' | 'PM'): number {
  if (period === 'AM') return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
}

function formatDisplay(s: string): string {
  const parsed = parse24(s);
  if (!parsed) return '';
  const { h12, period } = to12(parsed.h);
  return `${pad(h12)}:${pad(parsed.m)} ${period}`;
}

export default function TimePicker({
  value,
  onChange,
  placeholder = 'Select time',
  error = false,
  className = '',
  disabled = false,
}: TimePickerProps) {
  const parsed = parse24(value);

  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(() => {
    if (parsed) return to12(parsed.h).h12;
    return 12;
  });
  const [minute, setMinute] = useState(() => parsed?.m ?? 0);
  const [period, setPeriod] = useState<'AM' | 'PM'>(() => {
    if (parsed) return to12(parsed.h).period;
    return 'AM';
  });
  const [dropdownPosition, setDropdownPosition] = useState<'below' | 'above'>('below');

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Determine dropdown position
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setDropdownPosition(spaceBelow < 220 ? 'above' : 'below');
  }, [open]);

  // Sync internal state when value changes externally
  useEffect(() => {
    const p = parse24(value);
    if (p) {
      const { h12, period: per } = to12(p.h);
      setHour(h12);
      setMinute(p.m);
      setPeriod(per);
    }
  }, [value]);

  const emit = useCallback(
    (h12: number, m: number, p: 'AM' | 'PM') => {
      const h24 = to24(h12, p);
      onChange(`${pad(h24)}:${pad(m)}`);
    },
    [onChange]
  );

  const incHour = () => {
    setHour((h) => {
      const next = h >= 12 ? 1 : h + 1;
      emit(next, minute, period);
      return next;
    });
  };
  const decHour = () => {
    setHour((h) => {
      const next = h <= 1 ? 12 : h - 1;
      emit(next, minute, period);
      return next;
    });
  };
  const incMinute = () => {
    setMinute((m) => {
      const next = m >= 59 ? 0 : m + 1;
      emit(hour, next, period);
      return next;
    });
  };
  const decMinute = () => {
    setMinute((m) => {
      const next = m <= 0 ? 59 : m - 1;
      emit(hour, next, period);
      return next;
    });
  };
  const togglePeriod = () => {
    setPeriod((p) => {
      const next = p === 'AM' ? 'PM' : 'AM';
      emit(hour, minute, next);
      return next;
    });
  };

  const setNow = () => {
    const now = new Date();
    const h24 = now.getHours();
    const m = now.getMinutes();
    const { h12, period: p } = to12(h24);
    setHour(h12);
    setMinute(m);
    setPeriod(p);
    onChange(`${pad(h24)}:${pad(m)}`);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-sm text-left transition-all
          ${error ? 'border-red-500' : open ? 'border-primary ring-1 ring-ring' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-white hover:border-gray-400 cursor-pointer'}
        `}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={`absolute z-[9999] bg-white rounded-xl shadow-xl border border-gray-200 p-4 animate-in fade-in zoom-in-95 duration-150
            ${dropdownPosition === 'above' ? 'bottom-full mb-1' : 'top-full mt-1'}
          `}
          style={{ left: 0, minWidth: '220px' }}
        >
          {/* Spinners */}
          <div className="flex items-center justify-center gap-3">
            {/* Hour spinner */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={incHour}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors text-gray-500"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <div className="w-12 h-10 flex items-center justify-center rounded-lg bg-primary/5 text-primary text-xl font-bold">
                {pad(hour)}
              </div>
              <button
                type="button"
                onClick={decHour}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors text-gray-500"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <span className="text-xl font-bold text-gray-400 mt-[-2px]">:</span>

            {/* Minute spinner */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={incMinute}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors text-gray-500"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <div className="w-12 h-10 flex items-center justify-center rounded-lg bg-primary/5 text-primary text-xl font-bold">
                {pad(minute)}
              </div>
              <button
                type="button"
                onClick={decMinute}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors text-gray-500"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* AM/PM toggle */}
            <div className="flex flex-col gap-1 ml-1">
              <button
                type="button"
                onClick={() => {
                  if (period !== 'AM') {
                    setPeriod('AM');
                    emit(hour, minute, 'AM');
                  }
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all
                  ${period === 'AM' ? 'bg-primary/50 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}
                `}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => {
                  if (period !== 'PM') {
                    setPeriod('PM');
                    emit(hour, minute, 'PM');
                  }
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all
                  ${period === 'PM' ? 'bg-primary/50 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}
                `}
              >
                PM
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={setNow}
              className="text-xs font-medium text-primary hover:text-primary transition-colors"
            >
              Now
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium px-3 py-1 bg-primary/50 text-white rounded-md hover:bg-primary transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
