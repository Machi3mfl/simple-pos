import type { Product } from "../entities/Product";

export interface ListProductsFilters {
  readonly categoryId?: string;
  readonly activeOnly?: boolean;
}

export interface ProductRepository {
  save(product: Product): Promise<void>;
  saveMany(products: readonly Product[]): Promise<void>;
  list(filters?: ListProductsFilters): Promise<readonly Product[]>;
}
