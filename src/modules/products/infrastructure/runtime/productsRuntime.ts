import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import { SupabaseProductRepository } from "@/modules/catalog/infrastructure/repositories/SupabaseProductRepository";
import { SupabaseInventoryRepository } from "@/modules/inventory/infrastructure/repositories/SupabaseInventoryRepository";

import { ListProductsWorkspaceUseCase } from "../../application/use-cases/ListProductsWorkspaceUseCase";

export function createProductsRuntime(): {
  listProductsWorkspaceUseCase: ListProductsWorkspaceUseCase;
} {
  const client = getSupabaseServerClient();
  const productRepository = new SupabaseProductRepository(client);
  const inventoryRepository = new SupabaseInventoryRepository(client);

  return {
    listProductsWorkspaceUseCase: new ListProductsWorkspaceUseCase(
      productRepository,
      inventoryRepository,
    ),
  };
}
