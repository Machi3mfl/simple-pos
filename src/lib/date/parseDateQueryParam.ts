export type DateQueryBoundary = "start" | "end";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateQueryParam(
  rawValue: string | null,
  boundary: DateQueryBoundary = "start",
): Date | null | "invalid" {
  if (rawValue === null) {
    return null;
  }

  const value = rawValue.trim();
  if (value.length === 0) {
    return null;
  }

  const isDateOnly = DATE_ONLY_PATTERN.test(value);
  const parsed = new Date(
    isDateOnly ? `${value}T00:00:00.000Z` : value,
  );

  if (Number.isNaN(parsed.getTime())) {
    return "invalid";
  }

  if (isDateOnly && boundary === "end") {
    parsed.setUTCHours(23, 59, 59, 999);
  }

  return parsed;
}
