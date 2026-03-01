import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import { CreateProductUseCase } from "@/modules/catalog/application/use-cases/CreateProductUseCase";
import { SupabaseProductRepository } from "@/modules/catalog/infrastructure/repositories/SupabaseProductRepository";
import { SupabaseInventoryRepository } from "@/modules/inventory/infrastructure/repositories/SupabaseInventoryRepository";

import { DeleteExternalCategoryMappingUseCase } from "../../application/use-cases/DeleteExternalCategoryMappingUseCase";
import { ImportExternalProductsUseCase } from "../../application/use-cases/ImportExternalProductsUseCase";
import { ListExternalCategoryMappingsUseCase } from "../../application/use-cases/ListExternalCategoryMappingsUseCase";
import { ListImportedProductHistoryUseCase } from "../../application/use-cases/ListImportedProductHistoryUseCase";
import { SearchExternalProductsUseCase } from "../../application/use-cases/SearchExternalProductsUseCase";
import { UpdateExternalCategoryMappingUseCase } from "../../application/use-cases/UpdateExternalCategoryMappingUseCase";
import { CatalogCreateProductWriter } from "../adapters/CatalogCreateProductWriter";
import { CarrefourCatalogProvider } from "../providers/carrefour/CarrefourCatalogProvider";
import { SupabaseExternalCategoryMappingRepository } from "../repositories/SupabaseExternalCategoryMappingRepository";
import { SupabaseImportedProductSourceRepository } from "../repositories/SupabaseImportedProductSourceRepository";
import { SupabaseProductImageAssetStore } from "../storage/SupabaseProductImageAssetStore";

export function createProductSourcingRuntime(): {
  listExternalCategoryMappingsUseCase: ListExternalCategoryMappingsUseCase;
  listImportedProductHistoryUseCase: ListImportedProductHistoryUseCase;
  searchExternalProductsUseCase: SearchExternalProductsUseCase;
  importExternalProductsUseCase: ImportExternalProductsUseCase;
  updateExternalCategoryMappingUseCase: UpdateExternalCategoryMappingUseCase;
  deleteExternalCategoryMappingUseCase: DeleteExternalCategoryMappingUseCase;
} {
  const client = getSupabaseServerClient();
  const productRepository = new SupabaseProductRepository(client);
  const inventoryRepository = new SupabaseInventoryRepository(client);
  const createProductUseCase = new CreateProductUseCase(productRepository, inventoryRepository);
  const retailerCatalogProvider = new CarrefourCatalogProvider();
  const catalogProductWriter = new CatalogCreateProductWriter(
    createProductUseCase,
    productRepository,
  );
  const productImageAssetStore = new SupabaseProductImageAssetStore(client);
  const importedProductSourceRepository = new SupabaseImportedProductSourceRepository(client);
  const externalCategoryMappingRepository = new SupabaseExternalCategoryMappingRepository(client);

  return {
    listExternalCategoryMappingsUseCase: new ListExternalCategoryMappingsUseCase(
      externalCategoryMappingRepository,
    ),
    listImportedProductHistoryUseCase: new ListImportedProductHistoryUseCase(
      importedProductSourceRepository,
    ),
    searchExternalProductsUseCase: new SearchExternalProductsUseCase(
      retailerCatalogProvider,
      externalCategoryMappingRepository,
    ),
    importExternalProductsUseCase: new ImportExternalProductsUseCase(
      catalogProductWriter,
      productImageAssetStore,
      importedProductSourceRepository,
      externalCategoryMappingRepository,
    ),
    updateExternalCategoryMappingUseCase: new UpdateExternalCategoryMappingUseCase(
      externalCategoryMappingRepository,
    ),
    deleteExternalCategoryMappingUseCase: new DeleteExternalCategoryMappingUseCase(
      externalCategoryMappingRepository,
    ),
  };
}
