import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ImportedProductHistoryRecord,
  ImportedProductSourceRepository,
} from "../../application/ports/ImportedProductSourceRepository";
import { ImportedProductSource } from "../../domain/entities/ImportedProductSource";
import type { ExternalCatalogProviderId } from "../../domain/entities/ExternalCatalogCandidate";

interface ImportedProductSourceRow {
  id: string;
  product_id: string;
  provider_id: ExternalCatalogProviderId;
  source_product_id: string;
  source_image_url: string;
  stored_image_path: string;
  stored_image_public_url: string;
  stored_image_content_type: string;
  stored_image_size_bytes: number;
  product_url: string | null;
  brand: string | null;
  ean: string | null;
  category_trail: string[];
  mapped_category_id: string;
  imported_at: string;
}

interface CatalogProductRow {
  id: string;
  name: string;
  sku: string;
}

function mapRowToEntity(row: ImportedProductSourceRow): ImportedProductSource {
  return ImportedProductSource.rehydrate({
    id: row.id,
    productId: row.product_id,
    providerId: row.provider_id,
    sourceProductId: row.source_product_id,
    sourceImageUrl: row.source_image_url,
    storedImagePath: row.stored_image_path,
    storedImagePublicUrl: row.stored_image_public_url,
    storedImageContentType: row.stored_image_content_type,
    storedImageSizeBytes: row.stored_image_size_bytes,
    productUrl: row.product_url,
    brand: row.brand,
    ean: row.ean,
    categoryTrail: row.category_trail,
    mappedCategoryId: row.mapped_category_id,
    importedAt: row.imported_at,
  });
}

function mapEntityToRow(source: ImportedProductSource): ImportedProductSourceRow {
  const primitives = source.toPrimitives();

  return {
    id: primitives.id,
    product_id: primitives.productId,
    provider_id: primitives.providerId,
    source_product_id: primitives.sourceProductId,
    source_image_url: primitives.sourceImageUrl,
    stored_image_path: primitives.storedImagePath,
    stored_image_public_url: primitives.storedImagePublicUrl,
    stored_image_content_type: primitives.storedImageContentType,
    stored_image_size_bytes: primitives.storedImageSizeBytes,
    product_url: primitives.productUrl,
    brand: primitives.brand,
    ean: primitives.ean,
    category_trail: [...primitives.categoryTrail],
    mapped_category_id: primitives.mappedCategoryId,
    imported_at: primitives.importedAt,
  };
}

export class SupabaseImportedProductSourceRepository implements ImportedProductSourceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(source: ImportedProductSource): Promise<void> {
    const row = mapEntityToRow(source);
    const { error } = await this.client.from("imported_product_sources").insert(row);

    if (error) {
      throw new Error(`Failed to save imported product source: ${error.message}`);
    }
  }

  async getBySource(
    providerId: ExternalCatalogProviderId,
    sourceProductId: string,
  ): Promise<ImportedProductSource | null> {
    const { data, error } = await this.client
      .from("imported_product_sources")
      .select("*")
      .eq("provider_id", providerId)
      .eq("source_product_id", sourceProductId.trim())
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to read imported product source: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapRowToEntity(data as ImportedProductSourceRow);
  }

  async listRecent(limit: number): Promise<readonly ImportedProductHistoryRecord[]> {
    const { data, error } = await this.client
      .from("imported_product_sources")
      .select("*")
      .order("imported_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list imported product sources: ${error.message}`);
    }

    const rows = (data ?? []) as ImportedProductSourceRow[];
    const productIds = rows.map((row) => row.product_id);

    const productsById = new Map<string, CatalogProductRow>();
    if (productIds.length > 0) {
      const { data: productData, error: productError } = await this.client
        .from("products")
        .select("id, name, sku")
        .in("id", productIds);

      if (productError) {
        throw new Error(`Failed to list catalog products for sourcing history: ${productError.message}`);
      }

      for (const product of (productData ?? []) as CatalogProductRow[]) {
        productsById.set(product.id, product);
      }
    }

    return rows.map((row) => {
      const product = productsById.get(row.product_id);

      return {
        id: row.id,
        productId: row.product_id,
        productName: product?.name ?? `Importado ${row.source_product_id}`,
        productSku: product?.sku ?? `CRF-${row.source_product_id}`,
        providerId: row.provider_id,
        sourceProductId: row.source_product_id,
        storedImagePublicUrl: row.stored_image_public_url,
        brand: row.brand,
        ean: row.ean,
        mappedCategoryId: row.mapped_category_id,
        importedAt: row.imported_at,
      };
    });
  }
}
