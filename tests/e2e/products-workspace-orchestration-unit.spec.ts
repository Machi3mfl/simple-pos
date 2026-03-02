import { expect, test } from "@playwright/test";

import { CreateProductUseCase } from "../../src/modules/catalog/application/use-cases/CreateProductUseCase";
import { Product } from "../../src/modules/catalog/domain/entities/Product";
import type {
  ListProductsFilters,
  ProductRepository,
} from "../../src/modules/catalog/domain/repositories/ProductRepository";
import { RegisterStockMovementUseCase } from "../../src/modules/inventory/application/use-cases/RegisterStockMovementUseCase";
import { InventoryItem } from "../../src/modules/inventory/domain/entities/InventoryItem";
import type {
  InventoryRepository,
  InventorySnapshotItem,
  StockMovementFilters,
} from "../../src/modules/inventory/domain/repositories/InventoryRepository";
import type { StockMovement } from "../../src/modules/inventory/domain/entities/StockMovement";

class InMemoryProductRepository implements ProductRepository {
  readonly items = new Map<string, Product>();

  async save(product: Product): Promise<void> {
    this.items.set(product.getId(), product);
  }

  async saveMany(products: readonly Product[]): Promise<void> {
    for (const product of products) {
      this.items.set(product.getId(), product);
    }
  }

  async list(filters?: ListProductsFilters): Promise<readonly Product[]> {
    return Array.from(this.items.values()).filter((product) => {
      const primitive = product.toPrimitives();
      if (filters?.categoryId && primitive.categoryId !== filters.categoryId) {
        return false;
      }

      if (filters?.activeOnly && !primitive.isActive) {
        return false;
      }

      if (filters?.q) {
        const normalizedQuery = filters.q.toLowerCase();
        return (
          primitive.name.toLowerCase().includes(normalizedQuery) ||
          primitive.sku.toLowerCase().includes(normalizedQuery)
        );
      }

      return true;
    });
  }

  async getById(productId: string): Promise<Product | null> {
    return this.items.get(productId) ?? null;
  }

  async getBySku(sku: string): Promise<Product | null> {
    const normalizedSku = sku.trim().toUpperCase();

    return Array.from(this.items.values()).find(
      (product) => product.toPrimitives().sku === normalizedSku,
    ) ?? null;
  }
}

class InMemoryInventoryRepository implements InventoryRepository {
  readonly items = new Map<string, InventoryItem>();
  readonly movements: StockMovement[] = [];

  async getInventoryItem(productId: string): Promise<InventoryItem | null> {
    return this.items.get(productId) ?? null;
  }

  async listInventorySnapshot(productIds?: readonly string[]): Promise<readonly InventorySnapshotItem[]> {
    const allowedIds = productIds ? new Set(productIds) : null;
    return Array.from(this.items.values())
      .filter((item) => !allowedIds || allowedIds.has(item.toPrimitives().productId))
      .map((item) => ({
        productId: item.toPrimitives().productId,
        stockOnHand: item.toPrimitives().stockOnHand,
        weightedAverageUnitCost: item.toPrimitives().weightedAverageUnitCost,
      }));
  }

  async saveInventoryItem(item: InventoryItem): Promise<void> {
    this.items.set(item.toPrimitives().productId, item);
  }

  async appendStockMovement(movement: StockMovement): Promise<void> {
    this.movements.push(movement);
  }

  async listStockMovements(filters?: StockMovementFilters): Promise<readonly StockMovement[]> {
    return this.movements.filter((movement) => {
      const primitives = movement.toPrimitives();
      if (filters?.productId && primitives.productId !== filters.productId) {
        return false;
      }

      if (filters?.movementType && primitives.movementType !== filters.movementType) {
        return false;
      }

      return true;
    });
  }
}

test.describe("products workspace orchestration (unit)", () => {
  test("create product initializes inventory snapshot and movement history", async () => {
    const productRepository = new InMemoryProductRepository();
    const inventoryRepository = new InMemoryInventoryRepository();
    const useCase = new CreateProductUseCase(productRepository, inventoryRepository);

    const created = await useCase.execute({
      name: "Yerba Test",
      categoryId: "pantry",
      price: 3200,
      cost: 1500,
      initialStock: 8,
      minStock: 3,
    });

    expect(created.stock).toBe(8);
    expect(created.minStock).toBe(3);
    expect(created.sku.length).toBeGreaterThan(0);

    const inventorySnapshot = await inventoryRepository.listInventorySnapshot([created.id]);
    expect(inventorySnapshot).toHaveLength(1);
    expect(inventorySnapshot[0]?.stockOnHand).toBe(8);
    expect(inventorySnapshot[0]?.weightedAverageUnitCost).toBe(1500);
    expect(inventoryRepository.movements).toHaveLength(1);
    expect(inventoryRepository.movements[0]?.toPrimitives().movementType).toBe("inbound");
  });

  test("register stock movement keeps legacy product stock mirrored from inventory", async () => {
    const productRepository = new InMemoryProductRepository();
    const inventoryRepository = new InMemoryInventoryRepository();
    const createProductUseCase = new CreateProductUseCase(productRepository, inventoryRepository);
    const product = await createProductUseCase.execute({
      name: "Pilas Test",
      categoryId: "other",
      price: 2000,
      cost: 900,
      initialStock: 4,
      minStock: 2,
    });

    const movementUseCase = new RegisterStockMovementUseCase(
      inventoryRepository,
      productRepository,
    );

    await movementUseCase.execute({
      productId: product.id,
      movementType: "inbound",
      quantity: 3,
      unitCost: 1200,
    });

    const persistedProduct = await productRepository.getById(product.id);
    expect(persistedProduct?.toPrimitives().stock).toBe(7);
    expect(persistedProduct?.toPrimitives().cost).toBeGreaterThan(900);

    await movementUseCase.execute({
      productId: product.id,
      movementType: "outbound",
      quantity: 2,
    });

    const persistedAfterOutbound = await productRepository.getById(product.id);
    expect(persistedAfterOutbound?.toPrimitives().stock).toBe(5);
    expect(inventoryRepository.movements).toHaveLength(3);
  });
});
