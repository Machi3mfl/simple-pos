import type { ExternalCatalogProviderId } from "../../domain/entities/ExternalCatalogCandidate";
import type { CategoryMappingRule } from "../../domain/entities/CategoryMappingRule";

export interface ExternalCategoryMappingRepository {
  getByExternalCategoryPath(
    providerId: ExternalCatalogProviderId,
    externalCategoryPath: string,
  ): Promise<CategoryMappingRule | null>;
  save(rule: CategoryMappingRule): Promise<void>;
}
