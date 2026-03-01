import { z } from "zod";

const providerIdSchema = z.literal("carrefour");

export const listCategoryMappingsQueryDTOSchema = z.object({
  providerId: providerIdSchema.optional().default("carrefour"),
  limit: z.coerce.number().int().min(1).max(50).optional().default(8),
});

export const categoryMappingItemDTOSchema = z.object({
  id: z.string().min(1),
  providerId: providerIdSchema,
  externalCategoryPath: z.string().min(1),
  internalCategoryId: z.string().min(1),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const listCategoryMappingsResponseDTOSchema = z.object({
  items: z.array(categoryMappingItemDTOSchema),
});

export const updateCategoryMappingDTOSchema = z.object({
  providerId: providerIdSchema.default("carrefour"),
  externalCategoryPath: z.string().trim().min(1),
  internalCategoryId: z.string().trim().min(1),
});

export const deleteCategoryMappingDTOSchema = z.object({
  providerId: providerIdSchema.default("carrefour"),
  externalCategoryPath: z.string().trim().min(1),
});
