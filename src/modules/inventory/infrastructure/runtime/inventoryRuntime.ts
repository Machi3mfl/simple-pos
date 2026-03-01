import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import { SupabaseProductRepository } from "@/modules/catalog/infrastructure/repositories/SupabaseProductRepository";

import { ListStockMovementsUseCase } from "../../application/use-cases/ListStockMovementsUseCase";
import { RegisterBulkStockMovementsUseCase } from "../../application/use-cases/RegisterBulkStockMovementsUseCase";
import { RegisterStockMovementUseCase } from "../../application/use-cases/RegisterStockMovementUseCase";
import { SupabaseInventoryRepository } from "../repositories/SupabaseInventoryRepository";

export function createInventoryRuntime(): {
  registerStockMovementUseCase: RegisterStockMovementUseCase;
  registerBulkStockMovementsUseCase: RegisterBulkStockMovementsUseCase;
  listStockMovementsUseCase: ListStockMovementsUseCase;
} {
  const client = getSupabaseServerClient();
  const inventoryRepository = new SupabaseInventoryRepository(client);
  const productRepository = new SupabaseProductRepository(client);
  const registerStockMovementUseCase = new RegisterStockMovementUseCase(
    inventoryRepository,
    productRepository,
  );

  return {
    registerStockMovementUseCase,
    registerBulkStockMovementsUseCase: new RegisterBulkStockMovementsUseCase(
      registerStockMovementUseCase,
    ),
    listStockMovementsUseCase: new ListStockMovementsUseCase(inventoryRepository),
  };
}
