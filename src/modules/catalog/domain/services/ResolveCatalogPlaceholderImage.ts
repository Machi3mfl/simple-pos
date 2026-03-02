import { normalizeCategoryCode } from "@/shared/core/category/categoryNaming";

const CATEGORY_PLACEHOLDER_TOKENS: Record<string, string> = {
  all: "ALL",
  "bebidas-gaseosas": "GASEOSA",
  "bebidas-aguas": "AGUA",
  alfajores: "ALFAJOR",
  galletitas: "GALLETAS",
  snacks: "SNACKS",
  "desayuno-y-merienda": "DESAYUNO",
  other: "PRODUCTO",
  main: "MAIN",
  drink: "DRINK",
  snack: "SNACK",
  dessert: "DESSERT",
};

function buildPlaceholderDataUri(label: string): string {
  const safeLabel = label.toUpperCase().slice(0, 8);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#e2e8f0'/><stop offset='100%' stop-color='#cbd5e1'/></linearGradient></defs><rect width='320' height='320' rx='36' fill='url(#g)'/><text x='160' y='174' text-anchor='middle' font-size='44' font-family='Arial, sans-serif' fill='#334155' font-weight='700'>${safeLabel}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function resolveCatalogPlaceholderImage(
  imageUrl: string | undefined,
  categoryId: string,
): string {
  const cleanImageUrl = imageUrl?.trim();
  if (cleanImageUrl && cleanImageUrl.length > 0) {
    return cleanImageUrl;
  }

  const token = CATEGORY_PLACEHOLDER_TOKENS[normalizeCategoryCode(categoryId)] ?? "PRODUCTO";
  return buildPlaceholderDataUri(token);
}
