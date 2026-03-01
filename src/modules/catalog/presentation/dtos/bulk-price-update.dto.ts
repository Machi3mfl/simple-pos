import { z } from "zod";

export const bulkPriceUpdateScopeTypeSchema = z.enum(["all", "category", "selection"]);
export type BulkPriceUpdateScopeType = z.infer<typeof bulkPriceUpdateScopeTypeSchema>;

export const bulkPriceUpdateModeSchema = z.enum(["percentage", "fixed_amount"]);
export type BulkPriceUpdateMode = z.infer<typeof bulkPriceUpdateModeSchema>;

export const bulkPriceUpdateScopeDTOSchema = z
  .object({
    type: bulkPriceUpdateScopeTypeSchema,
    categoryId: z.string().trim().min(1).optional(),
    productIds: z.array(z.string().trim().min(1)).min(1).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.type === "category" && !value.categoryId) {
      context.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "categoryId es obligatorio cuando scope.type es category.",
      });
    }

    if (value.type === "selection" && (!value.productIds || value.productIds.length === 0)) {
      context.addIssue({
        code: "custom",
        path: ["productIds"],
        message: "productIds es obligatorio cuando scope.type es selection.",
      });
    }
  });

export const bulkPriceUpdateDTOSchema = z
  .object({
    scope: bulkPriceUpdateScopeDTOSchema,
    mode: bulkPriceUpdateModeSchema,
    value: z.number().finite(),
    previewOnly: z.boolean().optional().default(false),
  })
  .strict();

export const bulkPriceUpdateInvalidItemDTOSchema = z
  .object({
    productId: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

export const bulkPriceUpdateResultItemDTOSchema = z
  .object({
    productId: z.string().min(1),
    oldPrice: z.number().positive(),
    newPrice: z.number(),
  })
  .strict();

export const bulkPriceUpdateResponseDTOSchema = z
  .object({
    batchId: z.string().min(1),
    updatedCount: z.number().int().min(0),
    items: z.array(bulkPriceUpdateResultItemDTOSchema),
    appliedAt: z.string().datetime(),
    previewOnly: z.boolean(),
    appliedBy: z.string().min(1),
    invalidItems: z.array(bulkPriceUpdateInvalidItemDTOSchema).default([]),
  })
  .strict();

export type BulkPriceUpdateScopeDTO = z.infer<typeof bulkPriceUpdateScopeDTOSchema>;
export type BulkPriceUpdateDTO = z.infer<typeof bulkPriceUpdateDTOSchema>;
export type BulkPriceUpdateResultItemDTO = z.infer<typeof bulkPriceUpdateResultItemDTOSchema>;
export type BulkPriceUpdateInvalidItemDTO = z.infer<typeof bulkPriceUpdateInvalidItemDTOSchema>;
export type BulkPriceUpdateResponseDTO = z.infer<typeof bulkPriceUpdateResponseDTOSchema>;
