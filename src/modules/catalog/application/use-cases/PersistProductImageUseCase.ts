import type {
  CatalogProductImageSource,
  ProductImageAssetStore,
} from "../ports/ProductImageAssetStore";

export interface PersistProductImageUseCaseInput {
  readonly entityIdHint?: string;
  readonly source: CatalogProductImageSource;
}

export interface PersistProductImageUseCaseOutput {
  readonly publicUrl: string;
  readonly storagePath: string;
  readonly contentType: string;
  readonly sizeBytes: number;
}

function sanitizeObjectKeySegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildObjectKey(entityIdHint?: string): string {
  const now = new Date().toISOString().slice(0, 10);
  const safeHint = sanitizeObjectKeySegment(entityIdHint ?? "");
  const suffix = crypto.randomUUID();

  if (safeHint.length > 0) {
    return `catalog-products/${now}/${safeHint}-${suffix}`;
  }

  return `catalog-products/${now}/${suffix}`;
}

export class PersistProductImageUseCase {
  constructor(private readonly productImageAssetStore: ProductImageAssetStore) {}

  async execute(
    input: PersistProductImageUseCaseInput,
  ): Promise<PersistProductImageUseCaseOutput> {
    const persisted = await this.productImageAssetStore.persistImage({
      source: input.source,
      desiredObjectKey: buildObjectKey(input.entityIdHint),
    });

    return {
      publicUrl: persisted.publicUrl,
      storagePath: persisted.storagePath,
      contentType: persisted.contentType,
      sizeBytes: persisted.sizeBytes,
    };
  }
}
