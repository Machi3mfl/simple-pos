import type { SupabaseClient } from "@supabase/supabase-js";

import { Product } from "../../domain/entities/Product";
import type {
  ListProductsFilters,
  ProductRepository,
} from "../../domain/repositories/ProductRepository";

interface ProductRow {
  id: string;
  sku: string;
  ean: string | null;
  name: string;
  category_id: string;
  price: number;
  cost: number | null;
  stock: number;
  min_stock: number;
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
    sku: row.sku,
    ean: row.ean ?? undefined,
    name: row.name,
    categoryId: row.category_id,
    price: toNumber(row.price),
    cost: row.cost === null ? undefined : toNumber(row.cost),
    stock: toNumber(row.stock),
    minStock: Math.trunc(toNumber(row.min_stock)),
    imageUrl: row.image_url,
    isActive: row.is_active,
  });
}

function mapProductToRow(product: Product): ProductRow {
  const primitives = product.toPrimitives();
  return {
    id: primitives.id,
    sku: primitives.sku,
    ean: primitives.ean ?? null,
    name: primitives.name,
    category_id: primitives.categoryId,
    price: primitives.price,
    cost: primitives.cost ?? null,
    stock: primitives.stock,
    min_stock: primitives.minStock,
    image_url: primitives.imageUrl,
    is_active: primitives.isActive,
  };
}

export class SupabaseProductRepository implements ProductRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(product: Product): Promise<void> {
    const row = mapProductToRow(product);
    const { error } = await this.client.from("products").upsert(row, { onConflict: "id" });

    if (error) {
      throw new Error(`Failed to save product in Supabase: ${error.message}`);
    }
  }

  async saveMany(products: readonly Product[]): Promise<void> {
    if (products.length === 0) {
      return;
    }

    const rows = products.map(mapProductToRow);
    const { error } = await this.client.from("products").upsert(rows, { onConflict: "id" });

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

    if (filters?.q) {
      const normalizedQuery = filters.q.trim();
      if (normalizedQuery.length > 0) {
        query = query.or(
          `name.ilike.%${normalizedQuery}%,sku.ilike.%${normalizedQuery}%,ean.ilike.%${normalizedQuery}%`,
        );
      }
    }

    if (filters?.ids && filters.ids.length > 0) {
      query = query.in("id", [...filters.ids]);
    }

    const { data, error } = await query.order("created_at", { ascending: true });
    if (error) {
      throw new Error(`Failed to list products from Supabase: ${error.message}`);
    }

    return (data ?? []).map((row) => mapRowToProduct(row as ProductRow));
  }

  async getById(productId: string): Promise<Product | null> {
    const { data, error } = await this.client
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to read product from Supabase: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapRowToProduct(data as ProductRow);
  }

  async getBySku(sku: string): Promise<Product | null> {
    const normalizedSku = sku.trim().toUpperCase();
    if (normalizedSku.length === 0) {
      return null;
    }

    const { data, error } = await this.client
      .from("products")
      .select("*")
      .eq("sku", normalizedSku)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to read product by sku from Supabase: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapRowToProduct(data as ProductRow);
  }
}
