import { expect, test } from "@playwright/test";

import type {
  CatalogProductRecord,
  CatalogProductWriter,
  CreateCatalogProductFromExternalCandidateInput,
} from "../../src/modules/product-sourcing/application/ports/CatalogProductWriter";
import type { ExternalCategoryMappingRepository } from "../../src/modules/product-sourcing/application/ports/ExternalCategoryMappingRepository";
import type { ImportedProductSourceRepository } from "../../src/modules/product-sourcing/application/ports/ImportedProductSourceRepository";
import type {
  PersistExternalImageInput,
  PersistedExternalImageAsset,
  ProductImageAssetStore,
} from "../../src/modules/product-sourcing/application/ports/ProductImageAssetStore";
import { ImportExternalProductsUseCase } from "../../src/modules/product-sourcing/application/use-cases/ImportExternalProductsUseCase";
import { CategoryMappingRule } from "../../src/modules/product-sourcing/domain/entities/CategoryMappingRule";
import { ImportedProductSource } from "../../src/modules/product-sourcing/domain/entities/ImportedProductSource";
import { resolveExternalCategoryPath } from "../../src/modules/product-sourcing/domain/services/ResolveExternalCategoryPath";

class InMemoryCatalogProductWriter implements CatalogProductWriter {
  private readonly products = new Map<string, CatalogProductRecord>();

  async createFromExternalCandidate(
    input: CreateCatalogProductFromExternalCandidateInput,
  ): Promise<CatalogProductRecord> {
    const sku = `CRF-${input.sourceProductId}`;
    if (this.products.has(sku)) {
      throw new Error(`Ya existe un producto importado para ${input.providerId} ${input.sourceProductId} (SKU ${sku}).`);
    }

    const created: CatalogProductRecord = {
      id: `product-${input.sourceProductId}`,
      sku,
      name: input.name,
      categoryId: input.categoryId,
      price: input.price,
      cost: input.cost,
      stock: input.initialStock,
      minStock: input.minStock,
      imageUrl: input.imageUrl ?? "https://example.com/placeholder.png",
      isActive: true,
    };

    this.products.set(sku, created);
    return created;
  }
}

class InMemoryProductImageAssetStore implements ProductImageAssetStore {
  readonly persisted: PersistExternalImageInput[] = [];

  async persistExternalImage(
    input: PersistExternalImageInput,
  ): Promise<PersistedExternalImageAsset> {
    this.persisted.push(input);

    return {
      storagePath: `${input.desiredObjectKey}.png`,
      publicUrl: `https://storage.local/${input.desiredObjectKey}.png`,
      contentType: "image/png",
      sizeBytes: 128,
    };
  }
}

class InMemoryImportedProductSourceRepository implements ImportedProductSourceRepository {
  private readonly items = new Map<string, ImportedProductSource>();

  async save(source: ImportedProductSource): Promise<void> {
    this.items.set(`${source.getProviderId()}:${source.getSourceProductId()}`, source);
  }

  async getBySource(providerId: "carrefour", sourceProductId: string): Promise<ImportedProductSource | null> {
    return this.items.get(`${providerId}:${sourceProductId}`) ?? null;
  }
}

class InMemoryExternalCategoryMappingRepository
  implements ExternalCategoryMappingRepository
{
  private readonly items = new Map<string, CategoryMappingRule>();

  async getByExternalCategoryPath(
    providerId: "carrefour",
    externalCategoryPath: string,
  ): Promise<CategoryMappingRule | null> {
    return this.items.get(`${providerId}:${externalCategoryPath}`) ?? null;
  }

  async save(rule: CategoryMappingRule): Promise<void> {
    const primitives = rule.toPrimitives();
    this.items.set(
      `${primitives.providerId}:${primitives.externalCategoryPath}`,
      rule,
    );
  }

  async listByProvider(): Promise<readonly CategoryMappingRule[]> {
    return Array.from(this.items.values());
  }

  async delete(providerId: "carrefour", externalCategoryPath: string): Promise<void> {
    this.items.delete(`${providerId}:${externalCategoryPath}`);
  }
}

test.describe("product sourcing import use case", () => {
  test("persists image assets, source trace, and category mappings for valid items", async () => {
    const writer = new InMemoryCatalogProductWriter();
    const assetStore = new InMemoryProductImageAssetStore();
    const sourceRepository = new InMemoryImportedProductSourceRepository();
    const mappingRepository = new InMemoryExternalCategoryMappingRepository();
    const useCase = new ImportExternalProductsUseCase(
      writer,
      assetStore,
      sourceRepository,
      mappingRepository,
    );

    const result = await useCase.execute({
      items: [
        {
          providerId: "carrefour",
          sourceProductId: "393964",
          name: "Coca Cola Zero 2,25",
          brand: "Coca Cola",
          ean: "7790895067570",
          categoryTrail: ["/Bebidas/Gaseosas/"],
          categoryId: "drink",
          price: 2000,
          initialStock: 0,
          minStock: 0,
          sourceImageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s0lH8sAAAAASUVORK5CYII=",
          productUrl: "https://example.com/cola-zero",
        },
      ],
    });

    expect(result.importedCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.item.imageUrl).toContain("https://storage.local/");
    expect(assetStore.persisted).toHaveLength(1);
    expect(assetStore.persisted[0]?.desiredObjectKey).toContain("carrefour/393964/primary");

    const savedSource = await sourceRepository.getBySource("carrefour", "393964");
    expect(savedSource?.toPrimitives().storedImagePublicUrl).toContain("https://storage.local/");
    expect(savedSource?.toPrimitives().productId).toBe("product-393964");

    const externalCategoryPath = resolveExternalCategoryPath(["/Bebidas/Gaseosas/"]);
    const savedMapping = await mappingRepository.getByExternalCategoryPath(
      "carrefour",
      externalCategoryPath ?? "",
    );
    expect(savedMapping?.toPrimitives().internalCategoryId).toBe("drink");
  });

  test("rejects duplicate source rows already imported in previous runs", async () => {
    const writer = new InMemoryCatalogProductWriter();
    const assetStore = new InMemoryProductImageAssetStore();
    const sourceRepository = new InMemoryImportedProductSourceRepository();
    const mappingRepository = new InMemoryExternalCategoryMappingRepository();
    const useCase = new ImportExternalProductsUseCase(
      writer,
      assetStore,
      sourceRepository,
      mappingRepository,
    );

    await useCase.execute({
      items: [
        {
          providerId: "carrefour",
          sourceProductId: "30138",
          name: "Coca Cola Original 2,25",
          brand: "Coca Cola",
          ean: "7790895000997",
          categoryTrail: ["/Bebidas/Gaseosas/"],
          categoryId: "drink",
          price: 2000,
          initialStock: 0,
          minStock: 0,
          sourceImageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s0lH8sAAAAASUVORK5CYII=",
          productUrl: "https://example.com/cola",
        },
      ],
    });

    const secondAttempt = await useCase.execute({
      items: [
        {
          providerId: "carrefour",
          sourceProductId: "30138",
          name: "Coca Cola Original 2,25",
          brand: "Coca Cola",
          ean: "7790895000997",
          categoryTrail: ["/Bebidas/Gaseosas/"],
          categoryId: "drink",
          price: 2000,
          initialStock: 0,
          minStock: 0,
          sourceImageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s0lH8sAAAAASUVORK5CYII=",
          productUrl: "https://example.com/cola",
        },
      ],
    });

    expect(secondAttempt.importedCount).toBe(0);
    expect(secondAttempt.invalidItems).toHaveLength(1);
    expect(secondAttempt.invalidItems[0]?.reason).toContain("Ya existe una importacion previa");
  });
});
