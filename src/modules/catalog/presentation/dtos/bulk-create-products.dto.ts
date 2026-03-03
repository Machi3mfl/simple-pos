import { z } from "zod";

import type { CreateProductDTO } from "./create-product.dto";
import { productDTOSchema } from "./product-response.dto";

const bulkCreateProductItemDTOSchema = z
  .object({
    sku: z.string().trim().min(1).max(40).optional(),
    ean: z.string().trim().regex(/^[0-9]{8,18}$/).optional(),
    name: z.string().trim().min(2).max(120),
    categoryId: z.string().trim().min(1).max(80),
    price: z.number().positive(),
    cost: z.number().positive().optional(),
    initialStock: z.number().int().min(0),
    minStock: z.number().int().min(0).default(0),
    imageUrl: z.string().trim().min(1).max(2048).optional(),
  })
  .strict();

export const bulkCreateProductsDTOSchema = z
  .object({
    items: z.array(bulkCreateProductItemDTOSchema).min(1),
  })
  .strict();

export const bulkCreateProductsResponseDTOSchema = z
  .object({
    importedCount: z.number().int().min(0),
    items: z.array(productDTOSchema),
    invalidItems: z
      .array(
        z
          .object({
            row: z.number().int().positive(),
            name: z.string().min(1).optional(),
            reason: z.string().min(1),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();

export type BulkCreateProductsDTO = z.infer<typeof bulkCreateProductsDTOSchema>;
export type BulkCreateProductsResponseDTO = z.infer<
  typeof bulkCreateProductsResponseDTOSchema
>;
export type BulkCreateProductItemDTO = CreateProductDTO;
