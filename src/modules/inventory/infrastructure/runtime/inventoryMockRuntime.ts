import { ListStockMovementsUseCase } from "../../application/use-cases/ListStockMovementsUseCase";
import { RegisterStockMovementUseCase } from "../../application/use-cases/RegisterStockMovementUseCase";
import { InMemoryInventoryRepository } from "../repositories/InMemoryInventoryRepository";

const inventoryRepository = new InMemoryInventoryRepository();

export const inventoryMockRuntime = {
  registerStockMovementUseCase: new RegisterStockMovementUseCase(inventoryRepository),
  listStockMovementsUseCase: new ListStockMovementsUseCase(inventoryRepository),
};
