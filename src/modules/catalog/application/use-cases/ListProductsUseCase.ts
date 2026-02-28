import type {
  ListProductsFilters,
  ProductRepository,
} from "../../domain/repositories/ProductRepository";

export interface ListProductsUseCaseInput extends ListProductsFilters {}

export interface ListProductsUseCaseOutputItem {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly cost?: number;
  readonly stock: number;
  readonly imageUrl: string;
  readonly isActive: boolean;
}

export class ListProductsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(
    input: ListProductsUseCaseInput = {},
  ): Promise<readonly ListProductsUseCaseOutputItem[]> {
    const products = await this.productRepository.list(input);
    return products.map((product) => product.toPrimitives());
  }
}
