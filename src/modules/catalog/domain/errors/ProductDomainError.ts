export class ProductDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductDomainError";
  }
}

export class InvalidProductNameError extends ProductDomainError {
  constructor() {
    super("Product name must contain at least 2 characters.");
    this.name = "InvalidProductNameError";
  }
}

export class InvalidCategoryIdError extends ProductDomainError {
  constructor() {
    super("Product category is required.");
    this.name = "InvalidCategoryIdError";
  }
}

export class InvalidProductPriceError extends ProductDomainError {
  constructor() {
    super("Product price must be greater than 0.");
    this.name = "InvalidProductPriceError";
  }
}

export class InvalidInitialStockError extends ProductDomainError {
  constructor() {
    super("Initial stock must be zero or greater.");
    this.name = "InvalidInitialStockError";
  }
}

export class InvalidUnitCostError extends ProductDomainError {
  constructor() {
    super("Product cost must be greater than 0 when provided.");
    this.name = "InvalidUnitCostError";
  }
}

export class InvalidBulkPriceUpdateValueError extends ProductDomainError {
  constructor() {
    super("Bulk price update value must be a finite number.");
    this.name = "InvalidBulkPriceUpdateValueError";
  }
}

export class MissingBulkPriceScopeParameterError extends ProductDomainError {
  constructor(scopeType: "category" | "selection") {
    super(
      scopeType === "category"
        ? "Scope category requires categoryId."
        : "Scope selection requires productIds.",
    );
    this.name = "MissingBulkPriceScopeParameterError";
  }
}

export class NoProductsFoundForBulkPriceUpdateError extends ProductDomainError {
  constructor() {
    super("No products found for the requested bulk price scope.");
    this.name = "NoProductsFoundForBulkPriceUpdateError";
  }
}

export interface InvalidBulkPriceItem {
  readonly productId: string;
  readonly reason: string;
}

export class BulkPriceUpdateConflictError extends ProductDomainError {
  constructor(readonly invalidItems: readonly InvalidBulkPriceItem[]) {
    super("Bulk price update contains invalid resulting prices.");
    this.name = "BulkPriceUpdateConflictError";
  }
}
