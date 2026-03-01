import { z } from "zod";

export const productDTOSchema = z
  .object({
    id: z.string().min(1),
    sku: z.string().min(1),
    name: z.string().min(1),
    categoryId: z.string().min(1),
    price: z.number().positive(),
    cost: z.number().positive().optional(),
    stock: z.number().min(0),
    minStock: z.number().int().min(0),
    imageUrl: z.string().min(1),
    isActive: z.boolean(),
  })
  .strict();

export const productListResponseDTOSchema = z
  .object({
    items: z.array(productDTOSchema),
  })
  .strict();

export const productResponseDTOSchema = z
  .object({
    item: productDTOSchema,
  })
  .strict();

export type ProductDTO = z.infer<typeof productDTOSchema>;
export type ProductListResponseDTO = z.infer<typeof productListResponseDTOSchema>;
export type ProductResponseDTO = z.infer<typeof productResponseDTOSchema>;
