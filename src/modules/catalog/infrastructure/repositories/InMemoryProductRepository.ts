import { getMockStore } from "@/infrastructure/config/mockStore";

import type { Product } from "../../domain/entities/Product";
import type {
  ListProductsFilters,
  ProductRepository,
} from "../../domain/repositories/ProductRepository";

export class InMemoryProductRepository implements ProductRepository {
  async save(product: Product): Promise<void> {
    const current = getMockStore().products;
    const index = current.findIndex((item) => item.getId() === product.getId());

    if (index === -1) {
      current.push(product);
      return;
    }

    current[index] = product;
  }

  async saveMany(products: readonly Product[]): Promise<void> {
    for (const product of products) {
      await this.save(product);
    }
  }

  async list(filters?: ListProductsFilters): Promise<readonly Product[]> {
    return getMockStore().products.filter((product) => {
      const primitive = product.toPrimitives();

      if (filters?.categoryId && primitive.categoryId !== filters.categoryId) {
        return false;
      }

      if (filters?.activeOnly && !primitive.isActive) {
        return false;
      }

      return true;
    });
  }
}
