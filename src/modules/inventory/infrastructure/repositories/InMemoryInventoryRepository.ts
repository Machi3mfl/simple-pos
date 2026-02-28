import { InventoryItem } from "../../domain/entities/InventoryItem";
import type { InventoryRepository, StockMovementFilters } from "../../domain/repositories/InventoryRepository";
import { StockMovement } from "../../domain/entities/StockMovement";

export class InMemoryInventoryRepository implements InventoryRepository {
  private static readonly inventoryByProductId = new Map<string, InventoryItem>();
  private static readonly stockMovements: StockMovement[] = [];

  async getInventoryItem(productId: string): Promise<InventoryItem | null> {
    return InMemoryInventoryRepository.inventoryByProductId.get(productId) ?? null;
  }

  async saveInventoryItem(item: InventoryItem): Promise<void> {
    const { productId } = item.toPrimitives();
    InMemoryInventoryRepository.inventoryByProductId.set(productId, item);
  }

  async appendStockMovement(movement: StockMovement): Promise<void> {
    InMemoryInventoryRepository.stockMovements.push(movement);
  }

  async listStockMovements(filters: StockMovementFilters = {}): Promise<readonly StockMovement[]> {
    return InMemoryInventoryRepository.stockMovements
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
