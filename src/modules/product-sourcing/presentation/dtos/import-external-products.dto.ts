import { z } from "zod";

import { productDTOSchema } from "@/modules/catalog/presentation/dtos/product-response.dto";

const importExternalProductItemDTOSchema = z
  .object({
    providerId: z.enum(["carrefour"]),
    sourceProductId: z.string().trim().min(1).max(120),
    name: z.string().trim().min(2).max(160),
    brand: z.string().trim().min(1).max(120).nullable().optional(),
    ean: z.string().trim().min(1).max(64).nullable().optional(),
    categoryTrail: z.array(z.string().trim().min(1).max(240)).default([]),
    categoryId: z.string().trim().min(1).max(80),
    price: z.number().positive(),
    initialStock: z.number().int().min(0),
    minStock: z.number().int().min(0).default(0),
    cost: z.number().positive().nullable().optional(),
    sourceImageUrl: z.string().trim().min(1).max(2048).nullable().optional(),
    productUrl: z.string().trim().min(1).max(2048).nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.initialStock > 0 && (value.cost === null || value.cost === undefined)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cost"],
        message: "cost is required when initialStock is greater than 0",
      });
    }
  });

export const importExternalProductsDTOSchema = z
  .object({
    items: z.array(importExternalProductItemDTOSchema).min(1),
  })
  .strict();

export const importExternalProductsResponseDTOSchema = z
  .object({
    importedCount: z.number().int().min(0),
    items: z.array(
      z
        .object({
          row: z.number().int().positive(),
          providerId: z.enum(["carrefour"]),
          sourceProductId: z.string().min(1),
          item: productDTOSchema,
        })
        .strict(),
    ),
    invalidItems: z.array(
      z
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
        .strict(),
    ),
  })
  .strict();

export type ImportExternalProductsDTO = z.infer<typeof importExternalProductsDTOSchema>;
export type ImportExternalProductsResponseDTO = z.infer<
  typeof importExternalProductsResponseDTOSchema
>;
