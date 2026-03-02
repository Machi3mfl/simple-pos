import type { ImportedProductSourceRepository } from "../ports/ImportedProductSourceRepository";

export interface ListImportedProductHistoryUseCaseInput {
  readonly limit: number;
}

export interface ListImportedProductHistoryUseCaseOutput {
  readonly items: readonly {
    readonly id: string;
    readonly productId: string;
    readonly productName: string;
    readonly productSku: string;
    readonly providerId: "carrefour";
    readonly sourceProductId: string;
    readonly storedImagePublicUrl: string;
    readonly brand: string | null;
    readonly ean: string | null;
    readonly mappedCategoryId: string;
    readonly importedAt: string;
  }[];
}

export class ListImportedProductHistoryUseCase {
  constructor(
    private readonly importedProductSourceRepository: ImportedProductSourceRepository,
  ) {}

  async execute(
    input: ListImportedProductHistoryUseCaseInput,
  ): Promise<ListImportedProductHistoryUseCaseOutput> {
    const items = await this.importedProductSourceRepository.listRecent(input.limit);

    return {
      items: items.map((item) => ({ ...item })),
    };
  }
}
