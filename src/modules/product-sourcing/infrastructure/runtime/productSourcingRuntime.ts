import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import { CreateProductUseCase } from "@/modules/catalog/application/use-cases/CreateProductUseCase";
import { SupabaseProductRepository } from "@/modules/catalog/infrastructure/repositories/SupabaseProductRepository";
import { SupabaseInventoryRepository } from "@/modules/inventory/infrastructure/repositories/SupabaseInventoryRepository";

import { ImportExternalProductsUseCase } from "../../application/use-cases/ImportExternalProductsUseCase";
import { SearchExternalProductsUseCase } from "../../application/use-cases/SearchExternalProductsUseCase";
import { CatalogCreateProductWriter } from "../adapters/CatalogCreateProductWriter";
import { CarrefourCatalogProvider } from "../providers/carrefour/CarrefourCatalogProvider";
import { SupabaseExternalCategoryMappingRepository } from "../repositories/SupabaseExternalCategoryMappingRepository";
import { SupabaseImportedProductSourceRepository } from "../repositories/SupabaseImportedProductSourceRepository";
import { SupabaseProductImageAssetStore } from "../storage/SupabaseProductImageAssetStore";

export function createProductSourcingRuntime(): {
  searchExternalProductsUseCase: SearchExternalProductsUseCase;
  importExternalProductsUseCase: ImportExternalProductsUseCase;
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
  };
}
