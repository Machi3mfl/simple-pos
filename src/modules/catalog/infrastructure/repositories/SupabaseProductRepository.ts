import type { SupabaseClient } from "@supabase/supabase-js";

import { Product } from "../../domain/entities/Product";
import type {
  ListProductsFilters,
  ProductRepository,
} from "../../domain/repositories/ProductRepository";

interface ProductRow {
  id: string;
  name: string;
  category_id: string;
  price: number;
  cost: number | null;
  stock: number;
  image_url: string;
  is_active: boolean;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new Error("Invalid numeric value in Supabase product row.");
}

function mapRowToProduct(row: ProductRow): Product {
  return Product.rehydrate({
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    price: toNumber(row.price),
    cost: row.cost === null ? undefined : toNumber(row.cost),
    stock: Math.trunc(toNumber(row.stock)),
    imageUrl: row.image_url,
    isActive: row.is_active,
  });
}

function mapProductToRow(product: Product): ProductRow {
  const primitives = product.toPrimitives();
  return {
    id: primitives.id,
    name: primitives.name,
    category_id: primitives.categoryId,
    price: primitives.price,
    cost: primitives.cost ?? null,
    stock: primitives.stock,
    image_url: primitives.imageUrl,
    is_active: primitives.isActive,
  };
}

export class SupabaseProductRepository implements ProductRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(product: Product): Promise<void> {
    const row = mapProductToRow(product);
    const { error } = await this.client
      .from("products")
      .upsert(row, { onConflict: "id" });

    if (error) {
      throw new Error(`Failed to save product in Supabase: ${error.message}`);
    }
  }

  async saveMany(products: readonly Product[]): Promise<void> {
    if (products.length === 0) {
      return;
    }

    const rows = products.map(mapProductToRow);
    const { error } = await this.client
      .from("products")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      throw new Error(`Failed to save products in Supabase: ${error.message}`);
    }
  }

  async list(filters?: ListProductsFilters): Promise<readonly Product[]> {
    let query = this.client.from("products").select("*");

    if (filters?.categoryId) {
      query = query.eq("category_id", filters.categoryId);
    }

    if (filters?.activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query.order("created_at", { ascending: true });
    if (error) {
      throw new Error(`Failed to list products from Supabase: ${error.message}`);
    }

    return (data ?? []).map((row) => mapRowToProduct(row as ProductRow));
  }
}
