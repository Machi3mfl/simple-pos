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

export class MissingInitialStockCostError extends ProductDomainError {
  constructor() {
    super("Se requiere costo cuando el producto se crea con stock inicial mayor a 0.");
    this.name = "MissingInitialStockCostError";
  }
}

export class InvalidProductSkuError extends ProductDomainError {
  constructor() {
    super("El SKU debe contener solo letras, números, espacios, guiones o guión bajo.");
    this.name = "InvalidProductSkuError";
  }
}

export class InvalidProductMinStockError extends ProductDomainError {
  constructor() {
    super("El stock mínimo debe ser un entero mayor o igual a 0.");
    this.name = "InvalidProductMinStockError";
  }
}

export class InvalidProductEanError extends ProductDomainError {
  constructor() {
    super("El EAN debe contener solo números y tener entre 8 y 18 dígitos.");
    this.name = "InvalidProductEanError";
  }
}

export class ProductNotFoundError extends ProductDomainError {
  constructor(productId: string) {
    super(`No se encontró el producto ${productId}.`);
    this.name = "ProductNotFoundError";
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
