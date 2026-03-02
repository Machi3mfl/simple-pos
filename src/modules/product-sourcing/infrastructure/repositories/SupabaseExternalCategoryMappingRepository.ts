import type { SupabaseClient } from "@supabase/supabase-js";

import type { ExternalCategoryMappingRepository } from "../../application/ports/ExternalCategoryMappingRepository";
import { CategoryMappingRule } from "../../domain/entities/CategoryMappingRule";
import type { ExternalCatalogProviderId } from "../../domain/entities/ExternalCatalogCandidate";

interface ExternalCategoryMappingRow {
  id: string;
  provider_id: ExternalCatalogProviderId;
  external_category_path: string;
  internal_category_id: string;
  created_at: string;
  updated_at: string;
}

function mapRowToEntity(row: ExternalCategoryMappingRow): CategoryMappingRule {
  return CategoryMappingRule.rehydrate({
    id: row.id,
    providerId: row.provider_id,
    externalCategoryPath: row.external_category_path,
    internalCategoryId: row.internal_category_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapEntityToRow(rule: CategoryMappingRule): ExternalCategoryMappingRow {
  const primitives = rule.toPrimitives();
  return {
    id: primitives.id,
    provider_id: primitives.providerId,
    external_category_path: primitives.externalCategoryPath,
    internal_category_id: primitives.internalCategoryId,
    created_at: primitives.createdAt,
    updated_at: primitives.updatedAt,
  };
}

export class SupabaseExternalCategoryMappingRepository
  implements ExternalCategoryMappingRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async getByExternalCategoryPath(
    providerId: ExternalCatalogProviderId,
    externalCategoryPath: string,
  ): Promise<CategoryMappingRule | null> {
    const { data, error } = await this.client
      .from("external_category_mappings")
      .select("*")
      .eq("provider_id", providerId)
      .eq("external_category_path", externalCategoryPath)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to read external category mapping: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapRowToEntity(data as ExternalCategoryMappingRow);
  }

  async listByProvider(
    providerId: ExternalCatalogProviderId,
    limit: number,
  ): Promise<readonly CategoryMappingRule[]> {
    const { data, error } = await this.client
      .from("external_category_mappings")
      .select("*")
      .eq("provider_id", providerId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list external category mappings: ${error.message}`);
    }

    return ((data ?? []) as ExternalCategoryMappingRow[]).map(mapRowToEntity);
  }

  async save(rule: CategoryMappingRule): Promise<void> {
    const row = mapEntityToRow(rule);
    const { error } = await this.client
      .from("external_category_mappings")
      .upsert(row, { onConflict: "provider_id,external_category_path" });

    if (error) {
      throw new Error(`Failed to save external category mapping: ${error.message}`);
    }
  }

  async delete(
    providerId: ExternalCatalogProviderId,
    externalCategoryPath: string,
  ): Promise<void> {
    const { error } = await this.client
      .from("external_category_mappings")
      .delete()
      .eq("provider_id", providerId)
      .eq("external_category_path", externalCategoryPath);

    if (error) {
      throw new Error(`Failed to delete external category mapping: ${error.message}`);
    }
  }
}
