import type { InventoryMovementType } from "../../domain/entities/InventoryItem";
import type { InventoryRepository } from "../../domain/repositories/InventoryRepository";

export interface ListStockMovementsUseCaseInput {
  readonly productId?: string;
  readonly movementType?: InventoryMovementType;
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
}

export interface ListStockMovementsUseCaseItem {
  readonly movementId: string;
  readonly productId: string;
  readonly movementType: InventoryMovementType;
  readonly quantity: number;
  readonly unitCost: number;
  readonly occurredAt: string;
  readonly stockOnHandAfter: number;
  readonly weightedAverageUnitCostAfter: number;
  readonly inventoryValueAfter: number;
  readonly reason?: string;
}

export class ListStockMovementsUseCase {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(
    input: ListStockMovementsUseCaseInput = {},
  ): Promise<readonly ListStockMovementsUseCaseItem[]> {
    const movements = await this.inventoryRepository.listStockMovements(input);
    return movements.map((movement) => movement.toPrimitives());
  }
}
