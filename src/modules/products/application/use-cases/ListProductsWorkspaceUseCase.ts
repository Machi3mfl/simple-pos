import type { ProductRepository } from "@/modules/catalog/domain/repositories/ProductRepository";
import type {
  InventoryRepository,
  InventorySnapshotItem,
} from "@/modules/inventory/domain/repositories/InventoryRepository";

export type ProductsWorkspaceSort = "stock" | "name" | "recent" | "price";
export type ProductsWorkspaceStockState =
  | "all"
  | "with_stock"
  | "low_stock"
  | "out_of_stock"
  | "inactive";

export interface ListProductsWorkspaceUseCaseInput {
  readonly q?: string;
  readonly categoryId?: string;
  readonly stockState?: ProductsWorkspaceStockState;
  readonly activeOnly?: boolean;
  readonly sort?: ProductsWorkspaceSort;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface ProductsWorkspaceItem {
  readonly id: string;
  readonly sku: string;
  readonly ean?: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly averageCost: number;
  readonly stock: number;
  readonly minStock: number;
  readonly imageUrl: string;
  readonly isActive: boolean;
  readonly stockState: Exclude<ProductsWorkspaceStockState, "all">;
  readonly lastMovementAt?: string;
  readonly lastMovementType?: "inbound" | "outbound" | "adjustment";
}

export interface ListProductsWorkspaceUseCaseOutput {
  readonly items: readonly ProductsWorkspaceItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly summary: {
    readonly withStock: number;
    readonly lowStock: number;
    readonly outOfStock: number;
    readonly stockValue: number;
  };
}

function resolveWorkspaceStockState(
  isActive: boolean,
  stock: number,
  minStock: number,
): ProductsWorkspaceItem["stockState"] {
  if (!isActive) {
    return "inactive";
  }

  if (stock <= 0) {
    return "out_of_stock";
  }

  if (stock <= minStock) {
    return "low_stock";
  }

  return "with_stock";
}

function stockStateWeight(state: ProductsWorkspaceItem["stockState"]): number {
  switch (state) {
    case "with_stock":
      return 0;
    case "low_stock":
      return 1;
    case "out_of_stock":
      return 2;
    default:
      return 3;
  }
}

function compareByRecent(left?: string, right?: string): number {
  if (left && right) {
    return new Date(right).getTime() - new Date(left).getTime();
  }

  if (left) {
    return -1;
  }

  if (right) {
    return 1;
  }

  return 0;
}

export class ListProductsWorkspaceUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  async execute(
    input: ListProductsWorkspaceUseCaseInput = {},
  ): Promise<ListProductsWorkspaceUseCaseOutput> {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
    const products = await this.productRepository.list({
      categoryId: input.categoryId,
      activeOnly: input.activeOnly,
      q: input.q,
    });
    const snapshot = await this.inventoryRepository.listInventorySnapshot(
      products.map((product) => product.getId()),
    );

    const snapshotByProductId = new Map<string, InventorySnapshotItem>(
      snapshot.map((item) => [item.productId, item]),
    );

    const mappedItems = products.map((product) => {
      const base = product.toPrimitives();
      const inventory = snapshotByProductId.get(base.id);
      const stock = inventory?.stockOnHand ?? base.stock ?? 0;
      const averageCost = inventory?.weightedAverageUnitCost ?? base.cost ?? 0;
      const stockState = resolveWorkspaceStockState(base.isActive, stock, base.minStock);

      return {
        id: base.id,
        sku: base.sku,
        ean: base.ean,
        name: base.name,
        categoryId: base.categoryId,
        price: base.price,
        averageCost,
        stock,
        minStock: base.minStock,
        imageUrl: base.imageUrl,
        isActive: base.isActive,
        stockState,
        lastMovementAt: inventory?.lastMovementAt,
        lastMovementType: inventory?.lastMovementType,
      } satisfies ProductsWorkspaceItem;
    });

    const filteredItems = mappedItems.filter((item) => {
      if (input.stockState && input.stockState !== "all" && item.stockState !== input.stockState) {
        return false;
      }

      return true;
    });

    const sortedItems = [...filteredItems].sort((left, right) => {
      const sortMode = input.sort ?? "stock";
      if (sortMode === "name") {
        return left.name.localeCompare(right.name, "es");
      }

      if (sortMode === "recent") {
        return compareByRecent(left.lastMovementAt, right.lastMovementAt);
      }

      if (sortMode === "price") {
        return right.price - left.price;
      }

      const stockStateDelta =
        stockStateWeight(left.stockState) - stockStateWeight(right.stockState);
      if (stockStateDelta !== 0) {
        return stockStateDelta;
      }

      if (right.stock !== left.stock) {
        return right.stock - left.stock;
      }

      return left.name.localeCompare(right.name, "es");
    });

    const startIndex = (page - 1) * pageSize;
    const pagedItems = sortedItems.slice(startIndex, startIndex + pageSize);

    return {
      items: pagedItems,
      page,
      pageSize,
      totalItems: sortedItems.length,
      totalPages: Math.max(1, Math.ceil(sortedItems.length / pageSize)),
      summary: {
        withStock: mappedItems.filter((item) => item.isActive && item.stock > item.minStock).length,
        lowStock: mappedItems.filter(
          (item) => item.isActive && item.stock > 0 && item.stock <= item.minStock,
        ).length,
        outOfStock: mappedItems.filter((item) => item.isActive && item.stock <= 0).length,
        stockValue: Number(
          mappedItems.reduce((sum, item) => sum + item.stock * item.averageCost, 0).toFixed(2),
        ),
      },
    };
  }
}
