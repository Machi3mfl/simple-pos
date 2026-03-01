import { ProductNotFoundError } from "../../domain/errors/ProductDomainError";
import type { ProductRepository } from "../../domain/repositories/ProductRepository";

export interface UpdateProductUseCaseInput {
  readonly productId: string;
  readonly sku?: string;
  readonly name?: string;
  readonly categoryId?: string;
  readonly price?: number;
  readonly cost?: number;
  readonly minStock?: number;
  readonly imageUrl?: string;
  readonly isActive?: boolean;
}

export interface UpdateProductUseCaseOutput {
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

export class UpdateProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: UpdateProductUseCaseInput): Promise<UpdateProductUseCaseOutput> {
    const currentProduct = await this.productRepository.getById(input.productId);
    if (!currentProduct) {
      throw new ProductNotFoundError(input.productId);
    }

    const updatedProduct = currentProduct.updateDetails({
      sku: input.sku,
      name: input.name,
      categoryId: input.categoryId,
      price: input.price,
      cost: input.cost,
      minStock: input.minStock,
      imageUrl: input.imageUrl,
      isActive: input.isActive,
    });

    await this.productRepository.save(updatedProduct);
    return updatedProduct.toPrimitives();
  }
}
