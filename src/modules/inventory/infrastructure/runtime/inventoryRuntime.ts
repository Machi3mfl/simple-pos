import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";

import { ListStockMovementsUseCase } from "../../application/use-cases/ListStockMovementsUseCase";
import { RegisterStockMovementUseCase } from "../../application/use-cases/RegisterStockMovementUseCase";
import { SupabaseInventoryRepository } from "../repositories/SupabaseInventoryRepository";

export function createInventoryRuntime(): {
  registerStockMovementUseCase: RegisterStockMovementUseCase;
  listStockMovementsUseCase: ListStockMovementsUseCase;
} {
  const inventoryRepository = new SupabaseInventoryRepository(getSupabaseServerClient());

  return {
    registerStockMovementUseCase: new RegisterStockMovementUseCase(inventoryRepository),
    listStockMovementsUseCase: new ListStockMovementsUseCase(inventoryRepository),
  };
}
