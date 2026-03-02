"use client";

import { z } from "zod";

import type { ProductDTO } from "@/modules/catalog/presentation/dtos/product-response.dto";

import { importExternalProductsResponseDTOSchema } from "../dtos/import-external-products.dto";
import { externalCatalogCandidateDTOSchema } from "../dtos/product-sourcing-search.dto";

const PRODUCT_SOURCING_SESSION_STORAGE_KEY = "simple_pos_product_sourcing_session_v1";
const PRODUCT_SOURCING_SESSION_VERSION = 1;

const importDraftSchema = z
  .object({
    name: z.string(),
    categoryId: z.string(),
    price: z.string(),
    initialStock: z.string(),
    cost: z.string(),
    minStock: z.string(),
  })
  .strict();

const productSourcingSessionSnapshotSchema = z
  .object({
    version: z.literal(PRODUCT_SOURCING_SESSION_VERSION),
    savedAt: z.string().datetime({ offset: true }),
    query: z.string(),
    activeSearchQuery: z.string(),
    results: z.array(externalCatalogCandidateDTOSchema),
    selectedIds: z.array(z.string()),
    importDrafts: z.record(z.string(), importDraftSchema),
    importResult: importExternalProductsResponseDTOSchema.nullable(),
    searchPerformed: z.boolean(),
    searchPage: z.number().int().min(1),
    hasMoreResults: z.boolean(),
  })
  .strict();

export type ProductSourcingSessionImportDraft = z.infer<typeof importDraftSchema>;
export type ProductSourcingSessionSnapshot = z.infer<
  typeof productSourcingSessionSnapshotSchema
>;
export interface ProductSourcingSessionResultItem {
  readonly providerId: "carrefour";
  readonly sourceProductId: string;
  readonly name: string;
  readonly brand: string | null;
  readonly ean: string | null;
  readonly categoryTrail: readonly string[];
  readonly suggestedCategoryId: string | null;
  readonly imageUrl: string | null;
  readonly referencePrice: number | null;
  readonly referenceListPrice: number | null;
  readonly productUrl: string | null;
}

export interface ProductSourcingSessionInvalidItem {
  readonly row: number;
  readonly sourceProductId: string;
  readonly name?: string;
  readonly code:
    | "duplicate_in_batch"
    | "already_imported"
    | "missing_image"
    | "invalid_image_source"
    | "unsupported_image_content_type"
    | "image_too_large"
    | "duplicate_imported_sku"
    | "unexpected_error";
  readonly retryable: boolean;
  readonly reason: string;
}

export interface ProductSourcingSessionImportResult {
  readonly importedCount: number;
  readonly items: readonly {
    readonly row: number;
    readonly providerId: "carrefour";
    readonly sourceProductId: string;
    readonly item: ProductDTO;
  }[];
  readonly invalidItems: readonly ProductSourcingSessionInvalidItem[];
}

export interface ProductSourcingSessionSnapshotInput {
  readonly query: string;
  readonly activeSearchQuery: string;
  readonly results: readonly ProductSourcingSessionResultItem[];
  readonly selectedIds: readonly string[];
  readonly importDrafts: Readonly<Record<string, ProductSourcingSessionImportDraft>>;
  readonly importResult: ProductSourcingSessionImportResult | null;
  readonly searchPerformed: boolean;
  readonly searchPage: number;
  readonly hasMoreResults: boolean;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getProductSourcingSessionStorageKey(): string {
  return PRODUCT_SOURCING_SESSION_STORAGE_KEY;
}

export function readProductSourcingSessionSnapshot(): ProductSourcingSessionSnapshot | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(PRODUCT_SOURCING_SESSION_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as unknown;
    const result = productSourcingSessionSnapshotSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function writeProductSourcingSessionSnapshot(
  snapshot: ProductSourcingSessionSnapshotInput,
): void {
  if (!isBrowser()) {
    return;
  }

  const payload = productSourcingSessionSnapshotSchema.parse({
    version: PRODUCT_SOURCING_SESSION_VERSION,
    savedAt: new Date().toISOString(),
    query: snapshot.query,
    activeSearchQuery: snapshot.activeSearchQuery,
    results: snapshot.results.map((item) => ({
      ...item,
      categoryTrail: [...item.categoryTrail],
    })),
    selectedIds: [...snapshot.selectedIds],
    importDrafts: Object.fromEntries(
      Object.entries(snapshot.importDrafts).map(([sourceProductId, draft]) => [
        sourceProductId,
        { ...draft },
      ]),
    ),
    importResult: snapshot.importResult
      ? {
          importedCount: snapshot.importResult.importedCount,
          items: snapshot.importResult.items.map((entry) => ({
            ...entry,
            item: { ...entry.item },
          })),
          invalidItems: snapshot.importResult.invalidItems.map((entry) => ({ ...entry })),
        }
      : null,
    searchPerformed: snapshot.searchPerformed,
    searchPage: snapshot.searchPage,
    hasMoreResults: snapshot.hasMoreResults,
  });

  window.localStorage.setItem(
    PRODUCT_SOURCING_SESSION_STORAGE_KEY,
    JSON.stringify(payload),
  );
}

export function clearProductSourcingSessionSnapshot(): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(PRODUCT_SOURCING_SESSION_STORAGE_KEY);
}
