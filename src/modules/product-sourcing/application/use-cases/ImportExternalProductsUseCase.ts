import { CategoryMappingRule } from "../../domain/entities/CategoryMappingRule";
import { ImportedProductSource } from "../../domain/entities/ImportedProductSource";
import type { ExternalCatalogProviderId } from "../../domain/entities/ExternalCatalogCandidate";
import {
  ExternalImageTooLargeError,
  ExternalSourceAlreadyImportedError,
  ImportedProductSkuAlreadyExistsError,
  InvalidExternalImageSourceError,
  MissingExternalImageUrlError,
  UnsupportedExternalImageContentTypeError,
} from "../../domain/errors/ProductSourcingDomainError";
import { resolveExternalCategoryPath } from "../../domain/services/ResolveExternalCategoryPath";
import { resolveImportedProductImageObjectKey } from "../../domain/services/ResolveImportedProductImageObjectKey";
import type {
  CatalogProductRecord,
  CatalogProductWriter,
} from "../ports/CatalogProductWriter";
import type { ExternalCategoryMappingRepository } from "../ports/ExternalCategoryMappingRepository";
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
  readonly code:
    | "duplicate_in_batch"
    | "already_imported"
    | "missing_image"
    | "invalid_image_source"
    | "unsupported_image_content_type"
    | "image_too_large"
    | "duplicate_imported_sku"
    | "unexpected_error";
  readonly retryable: boolean;
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
    private readonly externalCategoryMappingRepository: ExternalCategoryMappingRepository,
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
          code: "duplicate_in_batch",
          retryable: false,
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
          ean: item.ean ?? null,
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
        await this.persistCategoryMapping(item);

        importedItems.push({
          row,
          providerId: item.providerId,
          sourceProductId: normalizedSourceProductId,
          item: createdProduct,
        });
      } catch (error: unknown) {
        const classified = this.classifyImportError(error);
        invalidItems.push({
          row,
          sourceProductId: item.sourceProductId,
          name: item.name,
          code: classified.code,
          retryable: classified.retryable,
          reason: classified.reason,
        });
      }
    }

    return {
      importedCount: importedItems.length,
      items: importedItems,
      invalidItems,
    };
  }

  private classifyImportError(error: unknown): {
    readonly code: ImportExternalProductsUseCaseInvalidItem["code"];
    readonly retryable: boolean;
    readonly reason: string;
  } {
    if (error instanceof ExternalSourceAlreadyImportedError) {
      return {
        code: "already_imported",
        retryable: false,
        reason: error.message,
      };
    }

    if (error instanceof ImportedProductSkuAlreadyExistsError) {
      return {
        code: "duplicate_imported_sku",
        retryable: false,
        reason: error.message,
      };
    }

    if (error instanceof MissingExternalImageUrlError) {
      return {
        code: "missing_image",
        retryable: false,
        reason: error.message,
      };
    }

    if (error instanceof InvalidExternalImageSourceError) {
      return {
        code: "invalid_image_source",
        retryable: false,
        reason: error.message,
      };
    }

    if (error instanceof UnsupportedExternalImageContentTypeError) {
      return {
        code: "unsupported_image_content_type",
        retryable: false,
        reason: error.message,
      };
    }

    if (error instanceof ExternalImageTooLargeError) {
      return {
        code: "image_too_large",
        retryable: false,
        reason: error.message,
      };
    }

    return {
      code: "unexpected_error",
      retryable: true,
      reason:
        error instanceof Error
          ? error.message
          : "Ocurrio un error inesperado al importar el producto externo.",
    };
  }

  private async persistCategoryMapping(item: ImportExternalProductsUseCaseItemInput): Promise<void> {
    const externalCategoryPath = resolveExternalCategoryPath(item.categoryTrail);
    if (!externalCategoryPath) {
      return;
    }

    const now = new Date().toISOString();
    const rule = this.createCategoryMappingRule(
      item.providerId,
      externalCategoryPath,
      item.categoryId,
      now,
    );
    await this.externalCategoryMappingRepository.save(rule);
  }

  private createCategoryMappingRule(
    providerId: ExternalCatalogProviderId,
    externalCategoryPath: string,
    internalCategoryId: string,
    timestamp: string,
  ): CategoryMappingRule {
    return CategoryMappingRule.create({
      id: `${providerId}:${externalCategoryPath}`,
      providerId,
      externalCategoryPath,
      internalCategoryId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
}
