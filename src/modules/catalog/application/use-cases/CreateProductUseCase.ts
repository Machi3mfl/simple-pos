import { InventoryItem } from "@/modules/inventory/domain/entities/InventoryItem";
import { StockMovement } from "@/modules/inventory/domain/entities/StockMovement";
import type { InventoryRepository } from "@/modules/inventory/domain/repositories/InventoryRepository";

import { Product } from "../../domain/entities/Product";
import type { ProductRepository } from "../../domain/repositories/ProductRepository";
import { resolveCatalogPlaceholderImage } from "../../domain/services/ResolveCatalogPlaceholderImage";

export interface CreateProductUseCaseInput {
  readonly sku?: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly cost?: number;
  readonly initialStock: number;
  readonly minStock?: number;
  readonly imageUrl?: string;
}

export interface CreateProductUseCaseOutput {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly cost?: number;
  readonly stock: number;
  readonly minStock: number;
  readonly imageUrl: string;
  readonly isActive: boolean;
}

export class CreateProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  async execute(input: CreateProductUseCaseInput): Promise<CreateProductUseCaseOutput> {
    const imageUrl = resolveCatalogPlaceholderImage(input.imageUrl, input.categoryId);

    const product = Product.createNew({
      id: crypto.randomUUID(),
      sku: input.sku,
      name: input.name,
      categoryId: input.categoryId,
      price: input.price,
      cost: input.cost,
      initialStock: input.initialStock,
      minStock: input.minStock,
      imageUrl,
    });

    await this.productRepository.save(product);

    const initialInventory =
      input.initialStock > 0
        ? InventoryItem.rehydrate({
            productId: product.getId(),
            stockOnHand: input.initialStock,
            weightedAverageUnitCost: input.cost ?? 0,
          })
        : InventoryItem.initialize(product.getId());

    await this.inventoryRepository.saveInventoryItem(initialInventory);

    if (input.initialStock > 0) {
      const movement = StockMovement.register({
        id: crypto.randomUUID(),
        productId: product.getId(),
        movementType: "inbound",
        quantity: input.initialStock,
        unitCostApplied: input.cost ?? 0,
        occurredAt: new Date(),
        stockOnHandAfter: input.initialStock,
        weightedAverageUnitCostAfter: input.cost ?? 0,
        inventoryValueAfter: Number((input.initialStock * (input.cost ?? 0)).toFixed(4)),
        reason: "stock_inicial",
      });

      await this.inventoryRepository.appendStockMovement(movement);
    }

    return product.toPrimitives();
  }
}
