import type { ExternalCatalogProviderId } from "../entities/ExternalCatalogCandidate";

export function resolveImportedProductImageObjectKey(
  providerId: ExternalCatalogProviderId,
  sourceProductId: string,
): string {
  const safeSourceProductId = sourceProductId.trim().replace(/[^a-zA-Z0-9_-]+/g, "-");
  return `${providerId}/${safeSourceProductId}/primary`;
}
