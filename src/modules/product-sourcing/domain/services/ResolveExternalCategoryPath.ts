export function resolveExternalCategoryPath(categoryTrail: readonly string[]): string | null {
  const normalizedTrail = categoryTrail
    .map((entry) => entry.trim())
    .filter((entry, index, current) => entry.length > 0 && current.indexOf(entry) === index);

  if (normalizedTrail.length === 0) {
    return null;
  }

  return normalizedTrail.join(" | ");
}
