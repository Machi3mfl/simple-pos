const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface DateOnlyParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

function parseDateOnlyParts(value: string): DateOnlyParts | null {
  const normalized = value.trim();
  if (!DATE_ONLY_PATTERN.test(normalized)) {
    return null;
  }

  const [yearToken, monthToken, dayToken] = normalized.split("-");
  const year = Number(yearToken);
  const month = Number(monthToken);
  const day = Number(dayToken);
  const parsedDate = new Date(year, month - 1, day);
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
  };
}

export function isValidOperationalDate(value: string): boolean {
  return parseDateOnlyParts(value) !== null;
}

export function formatOperationalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function combineOperationalDateWithCurrentTime(
  operationalDate: string,
  now: Date = new Date(),
): Date {
  const parts = parseDateOnlyParts(operationalDate);
  if (!parts) {
    throw new Error("La fecha operativa debe usar formato YYYY-MM-DD.");
  }

  if (operationalDate === formatOperationalDate(now)) {
    return now;
  }

  // Historical loads are filtered later by day-based reports; pinning them to noon UTC
  // keeps the stored instant on the same calendar date across the project's target timezones.
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0));
}

export function isFutureOperationalDate(
  operationalDate: string,
  now: Date = new Date(),
): boolean {
  if (!isValidOperationalDate(operationalDate)) {
    return false;
  }

  return operationalDate > formatOperationalDate(now);
}
