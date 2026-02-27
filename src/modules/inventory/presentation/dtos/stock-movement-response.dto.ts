import type { StockMovementTypeDTO } from "./create-stock-movement.dto";

export interface StockMovementResponseDTO {
  readonly movementId: string;
  readonly productId: string;
  readonly movementType: StockMovementTypeDTO;
  readonly quantity: number;
  readonly unitCost?: number;
  readonly occurredAt: string;
}
