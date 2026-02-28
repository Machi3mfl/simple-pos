import { getBackendMode } from "@/infrastructure/config/runtimeMode";
import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";

import { ApplyBulkPriceUpdateUseCase } from "../../application/use-cases/ApplyBulkPriceUpdateUseCase";
import { CreateProductUseCase } from "../../application/use-cases/CreateProductUseCase";
import { ListProductsUseCase } from "../../application/use-cases/ListProductsUseCase";
import type { ProductRepository } from "../../domain/repositories/ProductRepository";
import { InMemoryProductRepository } from "../repositories/InMemoryProductRepository";
import { SupabaseProductRepository } from "../repositories/SupabaseProductRepository";

function createProductRepository(): ProductRepository {
  if (getBackendMode() === "supabase") {
    return new SupabaseProductRepository(getSupabaseServerClient());
  }

  return new InMemoryProductRepository();
}

const productRepository = createProductRepository();

export const catalogMockRuntime = {
  createProductUseCase: new CreateProductUseCase(productRepository),
  listProductsUseCase: new ListProductsUseCase(productRepository),
  applyBulkPriceUpdateUseCase: new ApplyBulkPriceUpdateUseCase(productRepository),
};
