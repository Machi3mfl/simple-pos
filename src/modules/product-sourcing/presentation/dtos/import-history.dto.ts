import { z } from "zod";

export const listImportedProductHistoryQueryDTOSchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional().default(6),
});

export const importedProductHistoryItemDTOSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string().min(1),
  productSku: z.string().min(1),
  providerId: z.literal("carrefour"),
  sourceProductId: z.string().min(1),
  storedImagePublicUrl: z.string().min(1),
  brand: z.string().min(1).nullable(),
  ean: z.string().min(1).nullable(),
  mappedCategoryId: z.string().min(1),
  importedAt: z.string().datetime({ offset: true }),
});

export const listImportedProductHistoryResponseDTOSchema = z.object({
  items: z.array(importedProductHistoryItemDTOSchema),
});
