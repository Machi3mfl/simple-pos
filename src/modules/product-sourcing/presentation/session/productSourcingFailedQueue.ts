"use client";

import { z } from "zod";

const PRODUCT_SOURCING_FAILED_QUEUE_STORAGE_KEY = "simple_pos_product_sourcing_failed_queue_v1";

const failedQueueDraftSchema = z
  .object({
    name: z.string(),
    categoryId: z.string(),
    price: z.string(),
    initialStock: z.string(),
    cost: z.string(),
    minStock: z.string(),
  })
  .strict();

const failedQueueCandidateSchema = z
  .object({
    providerId: z.literal("carrefour"),
    sourceProductId: z.string().min(1),
    name: z.string().min(1),
    brand: z.string().nullable(),
    ean: z.string().nullable(),
    categoryTrail: z.array(z.string()),
    suggestedCategoryId: z.string().nullable(),
    imageUrl: z.string().nullable(),
    referencePrice: z.number().nullable(),
    referenceListPrice: z.number().nullable(),
    productUrl: z.string().nullable(),
  })
  .strict();

const failedQueueInvalidItemSchema = z
  .object({
    row: z.number().int().positive(),
    sourceProductId: z.string().min(1),
    name: z.string().min(1).optional(),
    code: z.enum([
      "duplicate_in_batch",
      "already_imported",
      "missing_image",
      "invalid_image_source",
      "unsupported_image_content_type",
      "image_too_large",
      "duplicate_imported_sku",
      "unexpected_error",
    ]),
    retryable: z.boolean(),
    reason: z.string().min(1),
  })
  .strict();

const failedQueueResolvedItemSchema = z
  .object({
    productId: z.string().min(1),
    productName: z.string().min(1),
    productSku: z.string().min(1),
  })
  .strict();

const failedQueueStatusSchema = z.enum([
  "retryable",
  "non_recoverable",
  "dismissed",
  "resolved",
]);

const productSourcingFailedQueueEntrySchema = z
  .object({
    id: z.string().min(1),
    providerId: z.literal("carrefour"),
    sourceProductId: z.string().min(1),
    candidate: failedQueueCandidateSchema,
    draft: failedQueueDraftSchema,
    invalidItem: failedQueueInvalidItemSchema,
    status: failedQueueStatusSchema,
    failureCount: z.number().int().min(1),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
    resolvedItem: failedQueueResolvedItemSchema.nullable(),
  })
  .strict();

const productSourcingFailedQueueSchema = z.array(productSourcingFailedQueueEntrySchema);

export type ProductSourcingFailedQueueStatus = z.infer<typeof failedQueueStatusSchema>;
export type ProductSourcingFailedQueueEntry = z.infer<
  typeof productSourcingFailedQueueEntrySchema
>;
export type ProductSourcingFailedQueueDraft = z.infer<typeof failedQueueDraftSchema>;
export type ProductSourcingFailedQueueCandidate = z.infer<typeof failedQueueCandidateSchema>;
export type ProductSourcingFailedQueueInvalidItem = z.infer<
  typeof failedQueueInvalidItemSchema
>;
export interface UpsertProductSourcingFailedQueueEntryInput {
  readonly candidate: {
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
  };
  readonly draft: {
    readonly name: string;
    readonly categoryId: string;
    readonly price: string;
    readonly initialStock: string;
    readonly cost: string;
    readonly minStock: string;
  };
  readonly invalidItem: {
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
  };
}

interface ResolveProductSourcingFailedQueueEntryInput {
  readonly providerId: "carrefour";
  readonly sourceProductId: string;
  readonly resolvedItem: {
    readonly productId: string;
    readonly productName: string;
    readonly productSku: string;
  };
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function buildEntryId(providerId: "carrefour", sourceProductId: string): string {
  return `${providerId}:${sourceProductId}`;
}

function sortEntries(
  entries: readonly ProductSourcingFailedQueueEntry[],
): ProductSourcingFailedQueueEntry[] {
  return [...entries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function readQueue(): ProductSourcingFailedQueueEntry[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(PRODUCT_SOURCING_FAILED_QUEUE_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as unknown;
    const result = productSourcingFailedQueueSchema.safeParse(parsed);
    return result.success ? sortEntries(result.data) : [];
  } catch {
    return [];
  }
}

function writeQueue(entries: readonly ProductSourcingFailedQueueEntry[]): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    PRODUCT_SOURCING_FAILED_QUEUE_STORAGE_KEY,
    JSON.stringify(sortEntries(entries)),
  );
}

export function getProductSourcingFailedQueueStorageKey(): string {
  return PRODUCT_SOURCING_FAILED_QUEUE_STORAGE_KEY;
}

export function readProductSourcingFailedQueueEntries(): ProductSourcingFailedQueueEntry[] {
  return readQueue();
}

export function upsertProductSourcingFailedQueueEntries(
  inputs: readonly UpsertProductSourcingFailedQueueEntryInput[],
): ProductSourcingFailedQueueEntry[] {
  const currentQueue = readQueue();
  const entryMap = new Map(currentQueue.map((entry) => [entry.id, entry]));
  const now = new Date().toISOString();

  for (const input of inputs) {
    const id = buildEntryId(input.candidate.providerId, input.candidate.sourceProductId);
    const currentEntry = entryMap.get(id);
    entryMap.set(id, {
      id,
      providerId: input.candidate.providerId,
      sourceProductId: input.candidate.sourceProductId,
      candidate: {
        ...input.candidate,
        categoryTrail: [...input.candidate.categoryTrail],
      },
      draft: { ...input.draft },
      invalidItem: { ...input.invalidItem },
      status: input.invalidItem.retryable ? "retryable" : "non_recoverable",
      failureCount: currentEntry ? currentEntry.failureCount + 1 : 1,
      createdAt: currentEntry?.createdAt ?? now,
      updatedAt: now,
      resolvedItem: null,
    });
  }

  const nextQueue = sortEntries(Array.from(entryMap.values()));
  writeQueue(nextQueue);
  return nextQueue;
}

export function updateProductSourcingFailedQueueDraft(
  providerId: "carrefour",
  sourceProductId: string,
  draft: ProductSourcingFailedQueueDraft,
): ProductSourcingFailedQueueEntry[] {
  const currentQueue = readQueue();
  const id = buildEntryId(providerId, sourceProductId);
  const nextQueue = currentQueue.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          draft: { ...draft },
          updatedAt: new Date().toISOString(),
        }
      : entry,
  );
  writeQueue(nextQueue);
  return nextQueue;
}

export function markProductSourcingFailedQueueEntriesResolved(
  inputs: readonly ResolveProductSourcingFailedQueueEntryInput[],
): ProductSourcingFailedQueueEntry[] {
  if (inputs.length === 0) {
    return readQueue();
  }

  const currentQueue = readQueue();
  const resolvedById = new Map(
    inputs.map((input) => [
      buildEntryId(input.providerId, input.sourceProductId),
      input.resolvedItem,
    ]),
  );
  const now = new Date().toISOString();
  const nextQueue = currentQueue.map((entry) => {
    const resolvedItem = resolvedById.get(entry.id);
    if (!resolvedItem) {
      return entry;
    }

    return {
      ...entry,
      status: "resolved" as const,
      updatedAt: now,
      resolvedItem: { ...resolvedItem },
    };
  });

  writeQueue(nextQueue);
  return nextQueue;
}

export function markProductSourcingFailedQueueEntryDismissed(
  providerId: "carrefour",
  sourceProductId: string,
): ProductSourcingFailedQueueEntry[] {
  const currentQueue = readQueue();
  const id = buildEntryId(providerId, sourceProductId);
  const nextQueue = currentQueue.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          status: "dismissed" as const,
          updatedAt: new Date().toISOString(),
        }
      : entry,
  );

  writeQueue(nextQueue);
  return nextQueue;
}
