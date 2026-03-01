const CATEGORY_CONNECTORS = new Set([
  "a",
  "al",
  "con",
  "de",
  "del",
  "e",
  "el",
  "en",
  "la",
  "las",
  "los",
  "o",
  "para",
  "por",
  "sin",
  "u",
  "un",
  "una",
  "y",
]);

function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function normalizeCategoryCode(value: string): string {
  const folded = foldText(value)
    .replace(/&/g, " y ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim();

  if (folded.length === 0) {
    return "";
  }

  return folded.replace(/\s+/g, "-");
}

function capitalizeWord(value: string): string {
  if (value.length === 0) {
    return value;
  }

  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}

export function formatCategoryLabel(value: string): string {
  const code = normalizeCategoryCode(value);
  if (code.length === 0) {
    return "";
  }

  return code
    .split("-")
    .map((segment, index) => {
      if (index === 0) {
        return capitalizeWord(segment);
      }

      if (CATEGORY_CONNECTORS.has(segment)) {
        return segment;
      }

      return segment;
    })
    .join(" ");
}

function normalizeLookup(value: string): string {
  return foldText(value)
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface CategoryOption {
  readonly code: string;
  readonly label: string;
}

export function dedupeCategoryCodes(values: readonly string[]): readonly string[] {
  const unique = new Map<string, string>();

  for (const value of values) {
    const normalized = normalizeCategoryCode(value);
    if (normalized.length === 0 || unique.has(normalized)) {
      continue;
    }

    unique.set(normalized, normalized);
  }

  return Array.from(unique.values());
}

export function resolveCategoryCodeFromInput(
  rawValue: string,
  options: readonly CategoryOption[],
): string {
  const normalizedCode = normalizeCategoryCode(rawValue);
  if (normalizedCode.length === 0) {
    return "";
  }

  const normalizedLookup = normalizeLookup(rawValue);
  const matchedOption = options.find(
    (option) =>
      option.code === normalizedCode || normalizeLookup(option.label) === normalizedLookup,
  );

  return matchedOption?.code ?? normalizedCode;
}

export function resolveCategoryLabelFromInput(
  rawValue: string,
  options: readonly CategoryOption[],
): string {
  const resolvedCode = resolveCategoryCodeFromInput(rawValue, options);
  if (resolvedCode.length === 0) {
    return "";
  }

  const matchedOption = options.find((option) => option.code === resolvedCode);
  return matchedOption?.label ?? formatCategoryLabel(resolvedCode);
}
