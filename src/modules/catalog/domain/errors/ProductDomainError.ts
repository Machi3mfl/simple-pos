export class ProductDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductDomainError";
  }
}

export class InvalidProductNameError extends ProductDomainError {
  constructor() {
    super("El nombre del producto debe tener al menos 2 caracteres.");
    this.name = "InvalidProductNameError";
  }
}

export class InvalidCategoryIdError extends ProductDomainError {
  constructor() {
    super("La categoría del producto es obligatoria.");
    this.name = "InvalidCategoryIdError";
  }
}

export class InvalidProductPriceError extends ProductDomainError {
  constructor() {
    super("El precio del producto debe ser mayor a 0.");
    this.name = "InvalidProductPriceError";
  }
}

export class InvalidInitialStockError extends ProductDomainError {
  constructor() {
    super("El stock inicial debe ser cero o mayor.");
    this.name = "InvalidInitialStockError";
  }
}

export class InvalidUnitCostError extends ProductDomainError {
  constructor() {
    super("El costo del producto debe ser mayor a 0 cuando se informa.");
    this.name = "InvalidUnitCostError";
  }
}

export class InvalidBulkPriceUpdateValueError extends ProductDomainError {
  constructor() {
    super("El valor del ajuste masivo debe ser un número finito.");
    this.name = "InvalidBulkPriceUpdateValueError";
  }
}

export class MissingBulkPriceScopeParameterError extends ProductDomainError {
  constructor(scopeType: "category" | "selection") {
    super(
      scopeType === "category"
        ? "El alcance por categoría requiere categoryId."
        : "El alcance por selección requiere productIds.",
    );
    this.name = "MissingBulkPriceScopeParameterError";
  }
}

export class NoProductsFoundForBulkPriceUpdateError extends ProductDomainError {
  constructor() {
    super("No se encontraron productos para el alcance solicitado.");
    this.name = "NoProductsFoundForBulkPriceUpdateError";
  }
}

export interface InvalidBulkPriceItem {
  readonly productId: string;
  readonly reason: string;
}

export class BulkPriceUpdateConflictError extends ProductDomainError {
  constructor(readonly invalidItems: readonly InvalidBulkPriceItem[]) {
    super("La actualización masiva contiene precios resultantes inválidos.");
    this.name = "BulkPriceUpdateConflictError";
  }
}
