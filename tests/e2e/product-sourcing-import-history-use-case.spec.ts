import { expect, test } from "./support/test";

import type {
  ImportedProductHistoryRecord,
  ImportedProductSourceRepository,
} from "../../src/modules/product-sourcing/application/ports/ImportedProductSourceRepository";
import { ListImportedProductHistoryUseCase } from "../../src/modules/product-sourcing/application/use-cases/ListImportedProductHistoryUseCase";
import { ImportedProductSource } from "../../src/modules/product-sourcing/domain/entities/ImportedProductSource";

class InMemoryImportedProductSourceRepository implements ImportedProductSourceRepository {
  private readonly items = new Map<string, ImportedProductSource>();
  private readonly catalogNames = new Map<string, { name: string; sku: string }>();

  async save(source: ImportedProductSource): Promise<void> {
    const primitives = source.toPrimitives();
    this.items.set(`${primitives.providerId}:${primitives.sourceProductId}`, source);
    this.catalogNames.set(primitives.productId, {
      name: `Producto ${primitives.sourceProductId}`,
      sku: `CRF-${primitives.sourceProductId}`,
    });
  }

  async getBySource(
    providerId: "carrefour",
    sourceProductId: string,
  ): Promise<ImportedProductSource | null> {
    return this.items.get(`${providerId}:${sourceProductId}`) ?? null;
  }

  async listRecent(limit: number): Promise<readonly ImportedProductHistoryRecord[]> {
    return Array.from(this.items.values())
      .map((item) => item.toPrimitives())
      .sort((left, right) => right.importedAt.localeCompare(left.importedAt))
      .slice(0, limit)
      .map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: this.catalogNames.get(item.productId)?.name ?? `Producto ${item.sourceProductId}`,
        productSku: this.catalogNames.get(item.productId)?.sku ?? `CRF-${item.sourceProductId}`,
        providerId: item.providerId,
        sourceProductId: item.sourceProductId,
        storedImagePublicUrl: item.storedImagePublicUrl,
        brand: item.brand,
        ean: item.ean,
        mappedCategoryId: item.mappedCategoryId,
        importedAt: item.importedAt,
      }));
  }
}

test.describe("product sourcing import history use case", () => {
  test("lists recent imports ordered by importedAt desc", async () => {
    const repository = new InMemoryImportedProductSourceRepository();
    const useCase = new ListImportedProductHistoryUseCase(repository);

    await repository.save(
      ImportedProductSource.create({
        id: "trace-1",
        productId: "product-1",
        providerId: "carrefour",
        sourceProductId: "393964",
        sourceImageUrl: "https://example.com/1.png",
        storedImagePath: "carrefour/393964/primary.png",
        storedImagePublicUrl: "https://storage.local/393964.png",
        storedImageContentType: "image/png",
        storedImageSizeBytes: 128,
        productUrl: "https://example.com/p1",
        brand: "Coca Cola",
        ean: "7790895067570",
        categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/"],
        mappedCategoryId: "drink",
        importedAt: "2026-03-01T10:00:00.000Z",
      }),
    );

    await repository.save(
      ImportedProductSource.create({
        id: "trace-2",
        productId: "product-2",
        providerId: "carrefour",
        sourceProductId: "111111",
        sourceImageUrl: "https://example.com/2.png",
        storedImagePath: "carrefour/111111/primary.png",
        storedImagePublicUrl: "https://storage.local/111111.png",
        storedImageContentType: "image/png",
        storedImageSizeBytes: 128,
        productUrl: "https://example.com/p2",
        brand: "Coca Cola",
        ean: "7790895000000",
        categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/"],
        mappedCategoryId: "drink",
        importedAt: "2026-03-01T12:00:00.000Z",
      }),
    );

    const result = await useCase.execute({ limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.sourceProductId).toBe("111111");
    expect(result.items[0]?.productName).toBe("Producto 111111");
    expect(result.items[1]?.sourceProductId).toBe("393964");
  });
});
