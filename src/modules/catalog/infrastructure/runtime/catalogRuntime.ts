import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import { SupabaseInventoryRepository } from "@/modules/inventory/infrastructure/repositories/SupabaseInventoryRepository";

import { ApplyBulkPriceUpdateUseCase } from "../../application/use-cases/ApplyBulkPriceUpdateUseCase";
import { BulkCreateProductsUseCase } from "../../application/use-cases/BulkCreateProductsUseCase";
import { CreateProductUseCase } from "../../application/use-cases/CreateProductUseCase";
import { ListProductsUseCase } from "../../application/use-cases/ListProductsUseCase";
import { PersistProductImageUseCase } from "../../application/use-cases/PersistProductImageUseCase";
import { UpdateProductUseCase } from "../../application/use-cases/UpdateProductUseCase";
import { SupabaseProductRepository } from "../repositories/SupabaseProductRepository";
import { SupabaseCatalogProductImageAssetStore } from "../storage/SupabaseCatalogProductImageAssetStore";

export function createCatalogRuntime(): {
  createProductUseCase: CreateProductUseCase;
  bulkCreateProductsUseCase: BulkCreateProductsUseCase;
  listProductsUseCase: ListProductsUseCase;
  updateProductUseCase: UpdateProductUseCase;
  applyBulkPriceUpdateUseCase: ApplyBulkPriceUpdateUseCase;
  persistProductImageUseCase: PersistProductImageUseCase;
} {
  const client = getSupabaseServerClient();
  const productRepository = new SupabaseProductRepository(client);
  const inventoryRepository = new SupabaseInventoryRepository(client);
  const productImageAssetStore = new SupabaseCatalogProductImageAssetStore(client);
  const createProductUseCase = new CreateProductUseCase(productRepository, inventoryRepository);

  return {
    createProductUseCase,
    bulkCreateProductsUseCase: new BulkCreateProductsUseCase(createProductUseCase),
    listProductsUseCase: new ListProductsUseCase(productRepository),
    updateProductUseCase: new UpdateProductUseCase(productRepository),
    applyBulkPriceUpdateUseCase: new ApplyBulkPriceUpdateUseCase(productRepository),
    persistProductImageUseCase: new PersistProductImageUseCase(productImageAssetStore),
  };
}
