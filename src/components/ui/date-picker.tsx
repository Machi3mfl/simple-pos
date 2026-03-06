"use client";

import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly testId?: string;
  readonly className?: string;
  readonly buttonClassName?: string;
  readonly disabled?: boolean;
  readonly min?: string;
  readonly max?: string;
  readonly allowClear?: boolean;
  readonly invalid?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function parseDateInputValue(value: string): Date | undefined {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }

  const [yearToken, monthToken, dayToken] = normalized.split("-");
  const year = Number(yearToken);
  const month = Number(monthToken);
  const day = Number(dayToken);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return undefined;
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  testId,
  className,
  buttonClassName,
  disabled = false,
  min,
  max,
  allowClear = true,
  invalid = false,
}: DatePickerProps): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const selectedDate = useMemo(() => parseDateInputValue(value), [value]);
  const minDate = useMemo(() => parseDateInputValue(min ?? ""), [min]);
  const maxDate = useMemo(() => parseDateInputValue(max ?? ""), [max]);

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid={testId}
            disabled={disabled}
            data-invalid={invalid || undefined}
            className={cn(
              "flex min-h-[3.35rem] w-full items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-white px-4 text-left text-base text-slate-800 outline-none transition hover:border-slate-400 focus-visible:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60",
              !selectedDate && "text-slate-500",
              buttonClassName,
            )}
          >
            <span>{selectedDate ? dateFormatter.format(selectedDate) : placeholder}</span>
            <CalendarDays size={16} className="shrink-0 text-slate-400" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto rounded-2xl border border-slate-200 p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(nextDate) => {
              if (!nextDate) {
                return;
              }

              onChange(formatDateInputValue(nextDate));
              setIsOpen(false);
            }}
            fromDate={minDate}
            toDate={maxDate}
            initialFocus
          />
          {allowClear && selectedDate ? (
            <div className="border-t border-slate-200 p-2">
              <button
                type="button"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
              >
                Limpiar fecha
              </button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
