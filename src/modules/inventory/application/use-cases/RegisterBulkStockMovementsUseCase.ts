import {
  RegisterStockMovementUseCase,
  type RegisterStockMovementUseCaseInput,
} from "./RegisterStockMovementUseCase";

export interface RegisterBulkStockMovementsUseCaseInput {
  readonly items: readonly RegisterStockMovementUseCaseInput[];
}

export interface RegisterBulkStockMovementsUseCaseInvalidItem {
  readonly row: number;
  readonly productId: string;
  readonly reason: string;
}

export interface RegisterBulkStockMovementsUseCaseOutput {
  readonly appliedCount: number;
  readonly items: readonly Awaited<ReturnType<RegisterStockMovementUseCase["execute"]>>[];
  readonly invalidItems: readonly RegisterBulkStockMovementsUseCaseInvalidItem[];
}

export class RegisterBulkStockMovementsUseCase {
  constructor(
    private readonly registerStockMovementUseCase: RegisterStockMovementUseCase,
  ) {}

  async execute(
    input: RegisterBulkStockMovementsUseCaseInput,
  ): Promise<RegisterBulkStockMovementsUseCaseOutput> {
    const items: Awaited<ReturnType<RegisterStockMovementUseCase["execute"]>>[] = [];
    const invalidItems: RegisterBulkStockMovementsUseCaseInvalidItem[] = [];

    for (let index = 0; index < input.items.length; index += 1) {
      const item = input.items[index];
      try {
        items.push(await this.registerStockMovementUseCase.execute(item));
      } catch (error: unknown) {
        invalidItems.push({
          row: index + 1,
          productId: item.productId,
          reason: error instanceof Error ? error.message : "Error desconocido al registrar stock.",
        });
      }
    }

    return {
      appliedCount: items.length,
      items,
      invalidItems,
    };
  }
}
