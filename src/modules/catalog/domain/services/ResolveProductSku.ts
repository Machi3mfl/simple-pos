export function resolveProductSku(categoryId: string, id: string, explicitSku?: string): string {
  const normalizedExplicitSku = explicitSku?.trim().toUpperCase();
  if (normalizedExplicitSku && normalizedExplicitSku.length > 0) {
    return normalizedExplicitSku;
  }

  const normalizedCategory = categoryId
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "X");

  const normalizedId = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `${normalizedCategory}-${normalizedId.slice(-6)}`;
}
