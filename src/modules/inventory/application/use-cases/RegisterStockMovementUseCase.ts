import type { InventoryMovementType } from "../../domain/entities/InventoryItem";
import { InventoryItem } from "../../domain/entities/InventoryItem";
import { StockMovement } from "../../domain/entities/StockMovement";
import type { InventoryRepository } from "../../domain/repositories/InventoryRepository";
import { ProductNotFoundError } from "@/modules/catalog/domain/errors/ProductDomainError";
import type { ProductRepository } from "@/modules/catalog/domain/repositories/ProductRepository";

export interface RegisterStockMovementUseCaseInput {
  readonly productId: string;
  readonly movementType: InventoryMovementType;
  readonly quantity: number;
  readonly unitCost?: number;
  readonly occurredAt?: Date;
  readonly reason?: string;
}

export interface RegisterStockMovementUseCaseOutput {
  readonly movementId: string;
  readonly productId: string;
  readonly movementType: InventoryMovementType;
  readonly quantity: number;
  readonly unitCost: number;
  readonly occurredAt: string;
  readonly stockOnHandAfter: number;
  readonly weightedAverageUnitCostAfter: number;
  readonly inventoryValueAfter: number;
  readonly reason?: string;
}

export class RegisterStockMovementUseCase {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(
    input: RegisterStockMovementUseCaseInput,
  ): Promise<RegisterStockMovementUseCaseOutput> {
    const product = await this.productRepository.getById(input.productId);
    if (!product) {
      throw new ProductNotFoundError(input.productId);
    }

    const currentItem =
      (await this.inventoryRepository.getInventoryItem(input.productId)) ??
      InventoryItem.initialize(input.productId);

    const effect =
      input.movementType === "inbound"
        ? currentItem.applyInbound(input.quantity, input.unitCost ?? 0)
        : input.movementType === "outbound"
          ? currentItem.applyOutbound(input.quantity)
          : currentItem.applyAdjustment(input.quantity);

    const evolvedItem = currentItem.evolve(effect);
    const movement = StockMovement.register({
      id: crypto.randomUUID(),
      productId: input.productId,
      movementType: effect.movementType,
      quantity: effect.quantity,
      unitCostApplied: effect.unitCostApplied,
      occurredAt: input.occurredAt ?? new Date(),
      stockOnHandAfter: effect.stockOnHandAfter,
      weightedAverageUnitCostAfter: effect.weightedAverageUnitCostAfter,
      inventoryValueAfter: effect.inventoryValueAfter,
      reason: input.reason,
    });

    await this.inventoryRepository.saveInventoryItem(evolvedItem);
    await this.inventoryRepository.appendStockMovement(movement);
    await this.productRepository.save(
      product.withInventorySnapshot(
        effect.stockOnHandAfter,
        effect.weightedAverageUnitCostAfter,
      ),
    );

    return movement.toPrimitives();
  }
}
