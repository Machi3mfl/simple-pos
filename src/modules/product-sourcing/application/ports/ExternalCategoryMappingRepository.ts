import type { ExternalCatalogProviderId } from "../../domain/entities/ExternalCatalogCandidate";
import type { CategoryMappingRule } from "../../domain/entities/CategoryMappingRule";

export interface ExternalCategoryMappingRepository {
  getByExternalCategoryPath(
    providerId: ExternalCatalogProviderId,
    externalCategoryPath: string,
  ): Promise<CategoryMappingRule | null>;
  listByProvider(
    providerId: ExternalCatalogProviderId,
    limit: number,
  ): Promise<readonly CategoryMappingRule[]>;
  save(rule: CategoryMappingRule): Promise<void>;
  delete(providerId: ExternalCatalogProviderId, externalCategoryPath: string): Promise<void>;
}
