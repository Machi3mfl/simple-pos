import type { ExternalCatalogProviderId } from "../../domain/entities/ExternalCatalogCandidate";

export interface PersistExternalImageInput {
  readonly providerId: ExternalCatalogProviderId;
  readonly sourceProductId: string;
  readonly sourceImageUrl: string;
  readonly desiredObjectKey: string;
}

export interface PersistedExternalImageAsset {
  readonly storagePath: string;
  readonly publicUrl: string;
  readonly contentType: string;
  readonly sizeBytes: number;
}

export interface ProductImageAssetStore {
  persistExternalImage(input: PersistExternalImageInput): Promise<PersistedExternalImageAsset>;
}
