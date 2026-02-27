export class SaleDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaleDomainError";
  }
}

export class EmptySaleItemsError extends SaleDomainError {
  constructor() {
    super("A sale requires at least one item.");
    this.name = "EmptySaleItemsError";
  }
}

export class InvalidSaleQuantityError extends SaleDomainError {
  constructor(productId: string) {
    super(`Invalid quantity for product '${productId}'.`);
    this.name = "InvalidSaleQuantityError";
  }
}

export class SaleCustomerRequiredError extends SaleDomainError {
  constructor() {
    super("Customer is required when payment method is on_account.");
    this.name = "SaleCustomerRequiredError";
  }
}
