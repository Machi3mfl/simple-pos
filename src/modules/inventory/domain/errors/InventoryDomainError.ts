export class InventoryDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryDomainError";
  }
}

export class InvalidInventoryQuantityError extends InventoryDomainError {
  constructor() {
    super("La cantidad del movimiento de stock debe ser mayor a 0.");
    this.name = "InvalidInventoryQuantityError";
  }
}

export class InvalidInboundUnitCostError extends InventoryDomainError {
  constructor() {
    super("El ingreso de stock requiere un costo unitario mayor a 0.");
    this.name = "InvalidInboundUnitCostError";
  }
}

export class InsufficientStockError extends InventoryDomainError {
  constructor(productId: string, requested: number, available: number) {
    super(
      `Stock insuficiente para el producto ${productId}. Pedido ${requested}, disponible ${available}.`,
    );
    this.name = "InsufficientStockError";
  }
}
