export interface PersistedCatalogProductImageAsset {
  readonly storagePath: string;
  readonly publicUrl: string;
  readonly contentType: string;
  readonly sizeBytes: number;
}

export type CatalogProductImageSource =
  | {
      readonly kind: "remote_url";
      readonly sourceImageUrl: string;
    }
  | {
      readonly kind: "uploaded_file";
      readonly originalFileName: string;
      readonly contentType: string;
      readonly bytes: ArrayBuffer;
    };

export interface PersistCatalogProductImageInput {
  readonly source: CatalogProductImageSource;
  readonly desiredObjectKey: string;
}

export interface ProductImageAssetStore {
  persistImage(
    input: PersistCatalogProductImageInput,
  ): Promise<PersistedCatalogProductImageAsset>;
}
