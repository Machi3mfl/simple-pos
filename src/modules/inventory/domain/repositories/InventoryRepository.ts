import type { InventoryMovementType } from "../entities/InventoryItem";
import type { InventoryItem } from "../entities/InventoryItem";
import type { StockMovement } from "../entities/StockMovement";

export interface StockMovementFilters {
  readonly productId?: string;
  readonly movementType?: InventoryMovementType;
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
}

export interface InventoryRepository {
  getInventoryItem(productId: string): Promise<InventoryItem | null>;
  saveInventoryItem(item: InventoryItem): Promise<void>;
  appendStockMovement(movement: StockMovement): Promise<void>;
  listStockMovements(filters?: StockMovementFilters): Promise<readonly StockMovement[]>;
}
