import {
  InvalidImportedProductSourceError,
} from "../errors/ProductSourcingDomainError";
import type { ExternalCatalogProviderId } from "./ExternalCatalogCandidate";

export interface ImportedProductSourcePrimitives {
  readonly id: string;
  readonly productId: string;
  readonly providerId: ExternalCatalogProviderId;
  readonly sourceProductId: string;
  readonly sourceImageUrl: string;
  readonly storedImagePath: string;
  readonly storedImagePublicUrl: string;
  readonly storedImageContentType: string;
  readonly storedImageSizeBytes: number;
  readonly productUrl: string | null;
  readonly brand: string | null;
  readonly ean: string | null;
  readonly categoryTrail: readonly string[];
  readonly mappedCategoryId: string;
  readonly importedAt: string;
}

function normalizeRequired(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new InvalidImportedProductSourceError(`${field} is required`);
  }

  return normalized;
}

function normalizeOptional(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export class ImportedProductSource {
  private constructor(private readonly props: ImportedProductSourcePrimitives) {}

  static create(props: Omit<ImportedProductSourcePrimitives, "importedAt"> & { importedAt?: string }): ImportedProductSource {
    const categoryTrail = props.categoryTrail
      .map((entry) => entry.trim())
      .filter((entry, index, current) => entry.length > 0 && current.indexOf(entry) === index);

    if (!Number.isInteger(props.storedImageSizeBytes) || props.storedImageSizeBytes <= 0) {
      throw new InvalidImportedProductSourceError("storedImageSizeBytes must be a positive integer");
    }

    return new ImportedProductSource({
      id: normalizeRequired(props.id, "id"),
      productId: normalizeRequired(props.productId, "productId"),
      providerId: props.providerId,
      sourceProductId: normalizeRequired(props.sourceProductId, "sourceProductId"),
      sourceImageUrl: normalizeRequired(props.sourceImageUrl, "sourceImageUrl"),
      storedImagePath: normalizeRequired(props.storedImagePath, "storedImagePath"),
      storedImagePublicUrl: normalizeRequired(props.storedImagePublicUrl, "storedImagePublicUrl"),
      storedImageContentType: normalizeRequired(props.storedImageContentType, "storedImageContentType"),
      storedImageSizeBytes: props.storedImageSizeBytes,
      productUrl: normalizeOptional(props.productUrl),
      brand: normalizeOptional(props.brand),
      ean: normalizeOptional(props.ean),
      categoryTrail,
      mappedCategoryId: normalizeRequired(props.mappedCategoryId, "mappedCategoryId"),
      importedAt: props.importedAt ?? new Date().toISOString(),
    });
  }

  static rehydrate(props: ImportedProductSourcePrimitives): ImportedProductSource {
    return new ImportedProductSource(props);
  }

  getProductId(): string {
    return this.props.productId;
  }

  getProviderId(): ExternalCatalogProviderId {
    return this.props.providerId;
  }

  getSourceProductId(): string {
    return this.props.sourceProductId;
  }

  toPrimitives(): ImportedProductSourcePrimitives {
    return {
      ...this.props,
      categoryTrail: [...this.props.categoryTrail],
    };
  }
}
