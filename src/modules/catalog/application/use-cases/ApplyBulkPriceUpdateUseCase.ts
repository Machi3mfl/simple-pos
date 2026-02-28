import type { Product, BulkPriceUpdateMode } from "../../domain/entities/Product";
import {
  BulkPriceUpdateConflictError,
  InvalidBulkPriceUpdateValueError,
  MissingBulkPriceScopeParameterError,
  NoProductsFoundForBulkPriceUpdateError,
} from "../../domain/errors/ProductDomainError";
import type { ProductRepository } from "../../domain/repositories/ProductRepository";

export type BulkPriceUpdateScope =
  | { readonly type: "all" }
  | { readonly type: "category"; readonly categoryId: string }
  | { readonly type: "selection"; readonly productIds: readonly string[] };

export interface ApplyBulkPriceUpdateUseCaseInput {
  readonly scope: BulkPriceUpdateScope;
  readonly mode: BulkPriceUpdateMode;
  readonly value: number;
  readonly previewOnly: boolean;
  readonly appliedBy: string;
}

export interface ApplyBulkPriceUpdateItem {
  readonly productId: string;
  readonly oldPrice: number;
  readonly newPrice: number;
}

export interface ApplyBulkPriceUpdateInvalidItem {
  readonly productId: string;
  readonly reason: string;
}

export interface ApplyBulkPriceUpdateUseCaseOutput {
  readonly batchId: string;
  readonly updatedCount: number;
  readonly items: readonly ApplyBulkPriceUpdateItem[];
  readonly appliedAt: string;
  readonly previewOnly: boolean;
  readonly appliedBy: string;
  readonly invalidItems: readonly ApplyBulkPriceUpdateInvalidItem[];
}

export class ApplyBulkPriceUpdateUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(
    input: ApplyBulkPriceUpdateUseCaseInput,
  ): Promise<ApplyBulkPriceUpdateUseCaseOutput> {
    if (!Number.isFinite(input.value)) {
      throw new InvalidBulkPriceUpdateValueError();
    }

    const scopedProducts = await this.resolveProductsByScope(input.scope);
    if (scopedProducts.length === 0) {
      throw new NoProductsFoundForBulkPriceUpdateError();
    }

    const repricedProducts: Product[] = [];
    const items: ApplyBulkPriceUpdateItem[] = [];
    const invalidItems: ApplyBulkPriceUpdateInvalidItem[] = [];

    for (const product of scopedProducts) {
      const primitive = product.toPrimitives();
      const nextPrice = product.previewReprice(input.mode, input.value);

      items.push({
        productId: primitive.id,
        oldPrice: primitive.price,
        newPrice: Number(nextPrice.toFixed(2)),
      });

      if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
        invalidItems.push({
          productId: primitive.id,
          reason: "resulting_price_must_be_greater_than_zero",
        });
        continue;
      }

      repricedProducts.push(product.reprice(input.mode, input.value));
    }

    if (invalidItems.length > 0 && !input.previewOnly) {
      throw new BulkPriceUpdateConflictError(invalidItems);
    }

    if (!input.previewOnly) {
      await this.productRepository.saveMany(repricedProducts);
    }

    return {
      batchId: crypto.randomUUID(),
      updatedCount: repricedProducts.length,
      items,
      appliedAt: new Date().toISOString(),
      previewOnly: input.previewOnly,
      appliedBy: input.appliedBy,
      invalidItems,
    };
  }

  private async resolveProductsByScope(scope: BulkPriceUpdateScope): Promise<readonly Product[]> {
    if (scope.type === "all") {
      return this.productRepository.list();
    }

    if (scope.type === "category") {
      const categoryId = scope.categoryId.trim();
      if (categoryId.length === 0) {
        throw new MissingBulkPriceScopeParameterError("category");
      }

      return this.productRepository.list({ categoryId });
    }

    const selectedIds = scope.productIds.map((id) => id.trim()).filter((id) => id.length > 0);
    if (selectedIds.length === 0) {
      throw new MissingBulkPriceScopeParameterError("selection");
    }

    const selectionSet = new Set(selectedIds);
    const allProducts = await this.productRepository.list();
    return allProducts.filter((product) => selectionSet.has(product.getId()));
  }
}
