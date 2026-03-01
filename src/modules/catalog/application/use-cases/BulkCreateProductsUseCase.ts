import { CreateProductUseCase, type CreateProductUseCaseInput } from "./CreateProductUseCase";

export interface BulkCreateProductsUseCaseInput {
  readonly items: readonly CreateProductUseCaseInput[];
}

export interface BulkCreateProductsUseCaseInvalidItem {
  readonly row: number;
  readonly name?: string;
  readonly reason: string;
}

export interface BulkCreateProductsUseCaseOutput {
  readonly importedCount: number;
  readonly items: readonly Awaited<ReturnType<CreateProductUseCase["execute"]>>[];
  readonly invalidItems: readonly BulkCreateProductsUseCaseInvalidItem[];
}

export class BulkCreateProductsUseCase {
  constructor(private readonly createProductUseCase: CreateProductUseCase) {}

  async execute(input: BulkCreateProductsUseCaseInput): Promise<BulkCreateProductsUseCaseOutput> {
    const items: Awaited<ReturnType<CreateProductUseCase["execute"]>>[] = [];
    const invalidItems: BulkCreateProductsUseCaseInvalidItem[] = [];

    for (let index = 0; index < input.items.length; index += 1) {
      const item = input.items[index];
      try {
        items.push(await this.createProductUseCase.execute(item));
      } catch (error: unknown) {
        invalidItems.push({
          row: index + 1,
          name: item.name,
          reason: error instanceof Error ? error.message : "Error desconocido al crear producto.",
        });
      }
    }

    return {
      importedCount: items.length,
      items,
      invalidItems,
    };
  }
}
