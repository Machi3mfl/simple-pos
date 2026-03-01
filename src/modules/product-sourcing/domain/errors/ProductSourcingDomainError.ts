export class ProductSourcingDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductSourcingDomainError";
  }
}

export class InvalidSearchQueryError extends ProductSourcingDomainError {
  constructor() {
    super("La busqueda debe contener al menos 3 caracteres significativos.");
    this.name = "InvalidSearchQueryError";
  }
}

export class InvalidSearchPaginationError extends ProductSourcingDomainError {
  constructor(field: "page" | "pageSize") {
    super(
      field === "page"
        ? "La pagina debe ser un entero positivo."
        : "El tamano de pagina debe ser un entero positivo entre 1 y 12.",
    );
    this.name = "InvalidSearchPaginationError";
  }
}

export class InvalidExternalCatalogCandidateError extends ProductSourcingDomainError {
  constructor(reason: string) {
    super(`El candidato externo es invalido: ${reason}`);
    this.name = "InvalidExternalCatalogCandidateError";
  }
}

export class ExternalSourceAlreadyImportedError extends ProductSourcingDomainError {
  constructor(providerId: string, sourceProductId: string) {
    super(`Ya existe una importacion previa para ${providerId} ${sourceProductId}.`);
    this.name = "ExternalSourceAlreadyImportedError";
  }
}

export class MissingExternalImageUrlError extends ProductSourcingDomainError {
  constructor(sourceProductId: string) {
    super(`El producto externo ${sourceProductId} no tiene una imagen primaria para importar.`);
    this.name = "MissingExternalImageUrlError";
  }
}

export class InvalidExternalImageSourceError extends ProductSourcingDomainError {
  constructor(reason: string) {
    super(`La fuente de imagen externa es invalida: ${reason}`);
    this.name = "InvalidExternalImageSourceError";
  }
}

export class UnsupportedExternalImageContentTypeError extends ProductSourcingDomainError {
  constructor(contentType: string) {
    super(`El tipo de imagen ${contentType} no esta soportado para importacion.`);
    this.name = "UnsupportedExternalImageContentTypeError";
  }
}

export class ExternalImageTooLargeError extends ProductSourcingDomainError {
  constructor(sizeBytes: number, maxBytes: number) {
    super(`La imagen externa pesa ${sizeBytes} bytes y supera el maximo permitido de ${maxBytes}.`);
    this.name = "ExternalImageTooLargeError";
  }
}

export class InvalidImportedProductSourceError extends ProductSourcingDomainError {
  constructor(reason: string) {
    super(`El registro de trazabilidad importado es invalido: ${reason}`);
    this.name = "InvalidImportedProductSourceError";
  }
}

export class InvalidCategoryMappingRuleError extends ProductSourcingDomainError {
  constructor(reason: string) {
    super(`La regla de mapeo de categoria es invalida: ${reason}`);
    this.name = "InvalidCategoryMappingRuleError";
  }
}
