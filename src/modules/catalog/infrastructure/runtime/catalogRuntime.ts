import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";

import { ApplyBulkPriceUpdateUseCase } from "../../application/use-cases/ApplyBulkPriceUpdateUseCase";
import { CreateProductUseCase } from "../../application/use-cases/CreateProductUseCase";
import { ListProductsUseCase } from "../../application/use-cases/ListProductsUseCase";
import { SupabaseProductRepository } from "../repositories/SupabaseProductRepository";

export function createCatalogRuntime(): {
  createProductUseCase: CreateProductUseCase;
  listProductsUseCase: ListProductsUseCase;
  applyBulkPriceUpdateUseCase: ApplyBulkPriceUpdateUseCase;
} {
  const productRepository = new SupabaseProductRepository(getSupabaseServerClient());

  return {
    createProductUseCase: new CreateProductUseCase(productRepository),
    listProductsUseCase: new ListProductsUseCase(productRepository),
    applyBulkPriceUpdateUseCase: new ApplyBulkPriceUpdateUseCase(productRepository),
  };
}
