export class InventoryDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryDomainError";
  }
}

export class InvalidInventoryQuantityError extends InventoryDomainError {
  constructor() {
    super("Stock movement quantity must be greater than 0.");
    this.name = "InvalidInventoryQuantityError";
  }
}

export class InvalidInboundUnitCostError extends InventoryDomainError {
  constructor() {
    super("Inbound stock movement requires unitCost greater than 0.");
    this.name = "InvalidInboundUnitCostError";
  }
}

export class InsufficientStockError extends InventoryDomainError {
  constructor(productId: string, requested: number, available: number) {
    super(
      `Insufficient stock for product ${productId}. Requested ${requested}, available ${available}.`,
    );
    this.name = "InsufficientStockError";
  }
}
