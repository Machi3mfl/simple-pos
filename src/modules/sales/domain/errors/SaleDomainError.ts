export class SaleDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaleDomainError";
  }
}

export class EmptySaleItemsError extends SaleDomainError {
  constructor() {
    super("La venta debe incluir al menos un ítem.");
    this.name = "EmptySaleItemsError";
  }
}

export class InvalidSaleQuantityError extends SaleDomainError {
  constructor(productId: string) {
    super(`Cantidad inválida para el producto '${productId}'.`);
    this.name = "InvalidSaleQuantityError";
  }
}

export class SaleCustomerRequiredError extends SaleDomainError {
  constructor() {
    super("El cliente es obligatorio cuando el método de pago es cuenta corriente.");
    this.name = "SaleCustomerRequiredError";
  }
}

export class SaleInitialPaymentOutOfRangeError extends SaleDomainError {
  constructor(total: number) {
    super(
      `El pago inicial en cuenta corriente debe ser mayor o igual a 0 y menor al total ${total}.`,
    );
    this.name = "SaleInitialPaymentOutOfRangeError";
  }
}
