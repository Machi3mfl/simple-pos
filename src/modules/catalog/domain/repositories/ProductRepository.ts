import type { Product } from "../entities/Product";

export interface ListProductsFilters {
  readonly categoryId?: string;
  readonly activeOnly?: boolean;
  readonly q?: string;
  readonly ids?: readonly string[];
}

export interface ProductRepository {
  save(product: Product): Promise<void>;
  saveMany(products: readonly Product[]): Promise<void>;
  list(filters?: ListProductsFilters): Promise<readonly Product[]>;
  getById(productId: string): Promise<Product | null>;
  getBySku(sku: string): Promise<Product | null>;
}
