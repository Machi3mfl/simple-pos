import { getMockStore } from "@/infrastructure/config/mockStore";

import type { InventoryItem } from "../../domain/entities/InventoryItem";
import type {
  InventoryRepository,
  StockMovementFilters,
} from "../../domain/repositories/InventoryRepository";
import type { StockMovement } from "../../domain/entities/StockMovement";

export class InMemoryInventoryRepository implements InventoryRepository {
  async getInventoryItem(productId: string): Promise<InventoryItem | null> {
    return getMockStore().inventoryByProductId.get(productId) ?? null;
  }

  async saveInventoryItem(item: InventoryItem): Promise<void> {
    const { productId } = item.toPrimitives();
    getMockStore().inventoryByProductId.set(productId, item);
  }

  async appendStockMovement(movement: StockMovement): Promise<void> {
    getMockStore().stockMovements.push(movement);
  }

  async listStockMovements(filters: StockMovementFilters = {}): Promise<readonly StockMovement[]> {
    return getMockStore()
      .stockMovements
      .filter((movement) => {
        if (filters.productId && movement.getProductId() !== filters.productId) {
          return false;
        }

        if (filters.movementType && movement.getMovementType() !== filters.movementType) {
          return false;
        }

        const occurredAt = movement.getOccurredAt();
        if (filters.dateFrom && occurredAt < filters.dateFrom) {
          return false;
        }

        if (filters.dateTo && occurredAt > filters.dateTo) {
          return false;
        }

        return true;
      })
      .sort(
        (left, right) =>
          right.getOccurredAt().getTime() - left.getOccurredAt().getTime(),
      );
  }
}
