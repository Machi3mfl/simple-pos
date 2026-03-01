import type { ExternalCatalogProviderId } from "../../domain/entities/ExternalCatalogCandidate";
import type { ImportedProductSource } from "../../domain/entities/ImportedProductSource";

export interface ImportedProductSourceRepository {
  save(source: ImportedProductSource): Promise<void>;
  getBySource(
    providerId: ExternalCatalogProviderId,
    sourceProductId: string,
  ): Promise<ImportedProductSource | null>;
}
