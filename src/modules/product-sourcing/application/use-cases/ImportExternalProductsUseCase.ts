import { ImportedProductSource } from "../../domain/entities/ImportedProductSource";
import type { ExternalCatalogProviderId } from "../../domain/entities/ExternalCatalogCandidate";
import {
  ExternalSourceAlreadyImportedError,
  MissingExternalImageUrlError,
} from "../../domain/errors/ProductSourcingDomainError";
import { resolveImportedProductImageObjectKey } from "../../domain/services/ResolveImportedProductImageObjectKey";
import type {
  CatalogProductRecord,
  CatalogProductWriter,
} from "../ports/CatalogProductWriter";
import type { ImportedProductSourceRepository } from "../ports/ImportedProductSourceRepository";
import type { ProductImageAssetStore } from "../ports/ProductImageAssetStore";

export interface ImportExternalProductsUseCaseItemInput {
  readonly providerId: ExternalCatalogProviderId;
  readonly sourceProductId: string;
  readonly name: string;
  readonly brand?: string | null;
  readonly ean?: string | null;
  readonly categoryTrail: readonly string[];
  readonly categoryId: string;
  readonly price: number;
  readonly initialStock: number;
  readonly minStock: number;
  readonly cost?: number;
  readonly sourceImageUrl?: string | null;
  readonly productUrl?: string | null;
}

export interface ImportExternalProductsUseCaseInput {
  readonly items: readonly ImportExternalProductsUseCaseItemInput[];
}

export interface ImportExternalProductsUseCaseSuccessItem {
  readonly row: number;
  readonly providerId: ExternalCatalogProviderId;
  readonly sourceProductId: string;
  readonly item: CatalogProductRecord;
}

export interface ImportExternalProductsUseCaseInvalidItem {
  readonly row: number;
  readonly sourceProductId: string;
  readonly name?: string;
  readonly reason: string;
}

export interface ImportExternalProductsUseCaseOutput {
  readonly importedCount: number;
  readonly items: readonly ImportExternalProductsUseCaseSuccessItem[];
  readonly invalidItems: readonly ImportExternalProductsUseCaseInvalidItem[];
}

export class ImportExternalProductsUseCase {
  constructor(
    private readonly catalogProductWriter: CatalogProductWriter,
    private readonly productImageAssetStore: ProductImageAssetStore,
    private readonly importedProductSourceRepository: ImportedProductSourceRepository,
  ) {}

  async execute(
    input: ImportExternalProductsUseCaseInput,
  ): Promise<ImportExternalProductsUseCaseOutput> {
    const importedItems: ImportExternalProductsUseCaseSuccessItem[] = [];
    const invalidItems: ImportExternalProductsUseCaseInvalidItem[] = [];
    const requestSeen = new Set<string>();

    for (let index = 0; index < input.items.length; index += 1) {
      const item = input.items[index]!;
      const row = index + 1;
      const requestKey = `${item.providerId}:${item.sourceProductId.trim()}`;

      if (requestSeen.has(requestKey)) {
        invalidItems.push({
          row,
          sourceProductId: item.sourceProductId,
          name: item.name,
          reason: "El mismo producto externo se envio mas de una vez en la importacion.",
        });
        continue;
      }

      requestSeen.add(requestKey);

      try {
        const normalizedSourceProductId = item.sourceProductId.trim();
        const existingSource = await this.importedProductSourceRepository.getBySource(
          item.providerId,
          normalizedSourceProductId,
        );

        if (existingSource) {
          throw new ExternalSourceAlreadyImportedError(
            item.providerId,
            normalizedSourceProductId,
          );
        }

        const sourceImageUrl = item.sourceImageUrl?.trim();
        if (!sourceImageUrl) {
          throw new MissingExternalImageUrlError(normalizedSourceProductId);
        }

        const imageAsset = await this.productImageAssetStore.persistExternalImage({
          providerId: item.providerId,
          sourceProductId: normalizedSourceProductId,
          sourceImageUrl,
          desiredObjectKey: resolveImportedProductImageObjectKey(
            item.providerId,
            normalizedSourceProductId,
          ),
        });

        const createdProduct = await this.catalogProductWriter.createFromExternalCandidate({
          providerId: item.providerId,
          sourceProductId: normalizedSourceProductId,
          name: item.name,
          categoryId: item.categoryId,
          price: item.price,
          initialStock: item.initialStock,
          minStock: item.minStock,
          cost: item.cost,
          imageUrl: imageAsset.publicUrl,
        });

        const importedSource = ImportedProductSource.create({
          id: crypto.randomUUID(),
          productId: createdProduct.id,
          providerId: item.providerId,
          sourceProductId: normalizedSourceProductId,
          sourceImageUrl,
          storedImagePath: imageAsset.storagePath,
          storedImagePublicUrl: imageAsset.publicUrl,
          storedImageContentType: imageAsset.contentType,
          storedImageSizeBytes: imageAsset.sizeBytes,
          productUrl: item.productUrl ?? null,
          brand: item.brand ?? null,
          ean: item.ean ?? null,
          categoryTrail: item.categoryTrail,
          mappedCategoryId: item.categoryId,
        });

        await this.importedProductSourceRepository.save(importedSource);

        importedItems.push({
          row,
          providerId: item.providerId,
          sourceProductId: normalizedSourceProductId,
          item: createdProduct,
        });
      } catch (error: unknown) {
        invalidItems.push({
          row,
          sourceProductId: item.sourceProductId,
          name: item.name,
          reason:
            error instanceof Error
              ? error.message
              : "Ocurrio un error inesperado al importar el producto externo.",
        });
      }
    }

    return {
      importedCount: importedItems.length,
      items: importedItems,
      invalidItems,
    };
  }
}
