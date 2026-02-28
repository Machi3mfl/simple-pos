import { Product } from "../../domain/entities/Product";
import { resolveCatalogPlaceholderImage } from "../../domain/services/ResolveCatalogPlaceholderImage";
import type { ProductRepository } from "../../domain/repositories/ProductRepository";

export interface CreateProductUseCaseInput {
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly cost?: number;
  readonly initialStock: number;
  readonly imageUrl?: string;
}

export interface CreateProductUseCaseOutput {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly cost?: number;
  readonly stock: number;
  readonly imageUrl: string;
  readonly isActive: boolean;
}

export class CreateProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: CreateProductUseCaseInput): Promise<CreateProductUseCaseOutput> {
    const imageUrl = resolveCatalogPlaceholderImage(input.imageUrl, input.categoryId);

    const product = Product.createNew({
      id: crypto.randomUUID(),
      name: input.name,
      categoryId: input.categoryId,
      price: input.price,
      cost: input.cost,
      initialStock: input.initialStock,
      imageUrl,
    });

    await this.productRepository.save(product);
    return product.toPrimitives();
  }
}
