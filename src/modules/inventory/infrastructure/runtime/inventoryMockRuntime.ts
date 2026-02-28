import { getBackendMode } from "@/infrastructure/config/runtimeMode";
import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";

import { ListStockMovementsUseCase } from "../../application/use-cases/ListStockMovementsUseCase";
import { RegisterStockMovementUseCase } from "../../application/use-cases/RegisterStockMovementUseCase";
import type { InventoryRepository } from "../../domain/repositories/InventoryRepository";
import { InMemoryInventoryRepository } from "../repositories/InMemoryInventoryRepository";
import { SupabaseInventoryRepository } from "../repositories/SupabaseInventoryRepository";

function createInventoryRepository(): InventoryRepository {
  if (getBackendMode() === "supabase") {
    return new SupabaseInventoryRepository(getSupabaseServerClient());
  }

  return new InMemoryInventoryRepository();
}

const inventoryRepository = createInventoryRepository();

export const inventoryMockRuntime = {
  registerStockMovementUseCase: new RegisterStockMovementUseCase(inventoryRepository),
  listStockMovementsUseCase: new ListStockMovementsUseCase(inventoryRepository),
};
