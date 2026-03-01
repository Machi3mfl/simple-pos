import { z } from "zod";

export const productSourcingSearchQueryDTOSchema = z
  .object({
    q: z.string().trim().min(3).max(120),
    page: z.preprocess(
      (value) => (value === undefined ? undefined : Number(value)),
      z.number().int().min(1).optional().default(1),
    ),
    pageSize: z.preprocess(
      (value) => (value === undefined ? undefined : Number(value)),
      z.number().int().min(1).max(12).optional().default(12),
    ),
  })
  .strict();

export const externalCatalogCandidateDTOSchema = z
  .object({
    providerId: z.literal("carrefour"),
    sourceProductId: z.string().min(1),
    name: z.string().min(1),
    brand: z.string().min(1).nullable(),
    ean: z.string().min(1).nullable(),
    categoryTrail: z.array(z.string().min(1)),
    suggestedCategoryId: z.string().min(1).nullable(),
    imageUrl: z.string().url().nullable(),
    referencePrice: z.number().nonnegative().nullable(),
    referenceListPrice: z.number().nonnegative().nullable(),
    productUrl: z.string().url().nullable(),
  })
  .strict();

export const productSourcingSearchResponseDTOSchema = z
  .object({
    providerId: z.literal("carrefour"),
    items: z.array(externalCatalogCandidateDTOSchema),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(12),
    hasMore: z.boolean(),
  })
  .strict();

export type ProductSourcingSearchQueryDTO = z.infer<
  typeof productSourcingSearchQueryDTOSchema
>;
export type ExternalCatalogCandidateDTO = z.infer<
  typeof externalCatalogCandidateDTOSchema
>;
export type ProductSourcingSearchResponseDTO = z.infer<
  typeof productSourcingSearchResponseDTOSchema
>;
