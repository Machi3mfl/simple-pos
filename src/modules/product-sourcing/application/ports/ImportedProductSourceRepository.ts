import type { ExternalCatalogProviderId } from "../../domain/entities/ExternalCatalogCandidate";
import type { ImportedProductSource } from "../../domain/entities/ImportedProductSource";

export interface ImportedProductHistoryRecord {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly productSku: string;
  readonly providerId: ExternalCatalogProviderId;
  readonly sourceProductId: string;
  readonly storedImagePublicUrl: string;
  readonly brand: string | null;
  readonly ean: string | null;
  readonly mappedCategoryId: string;
  readonly importedAt: string;
}

export interface ImportedProductSourceRepository {
  save(source: ImportedProductSource): Promise<void>;
  getBySource(
    providerId: ExternalCatalogProviderId,
    sourceProductId: string,
  ): Promise<ImportedProductSource | null>;
  listRecent(limit: number): Promise<readonly ImportedProductHistoryRecord[]>;
}
