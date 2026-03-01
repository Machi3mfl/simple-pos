import type { ExternalCatalogProviderId } from "../entities/ExternalCatalogCandidate";

const skuPrefixByProvider: Record<ExternalCatalogProviderId, string> = {
  carrefour: "CRF",
};

export function resolveImportedProductSku(
  providerId: ExternalCatalogProviderId,
  sourceProductId: string,
): string {
  const normalizedSourceProductId = sourceProductId.trim().toUpperCase();
  return `${skuPrefixByProvider[providerId]}-${normalizedSourceProductId}`;
}
