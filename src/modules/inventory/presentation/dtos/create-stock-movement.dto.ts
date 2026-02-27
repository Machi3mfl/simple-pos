export type StockMovementTypeDTO = "inbound" | "outbound" | "adjustment";

interface BaseStockMovementDTO {
  readonly productId: string;
  readonly movementType: StockMovementTypeDTO;
  readonly quantity: number;
  readonly reason?: string;
}

export interface CreateInboundStockMovementDTO extends BaseStockMovementDTO {
  readonly movementType: "inbound";
  readonly unitCost: number;
}

export interface CreateNonInboundStockMovementDTO extends BaseStockMovementDTO {
  readonly movementType: "outbound" | "adjustment";
  readonly unitCost?: never;
}

export type CreateStockMovementDTO =
  | CreateInboundStockMovementDTO
  | CreateNonInboundStockMovementDTO;
