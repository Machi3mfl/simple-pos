import { z } from "zod";

export const updateProductDTOSchema = z
  .object({
    sku: z.string().trim().min(1).max(40).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    categoryId: z.string().trim().min(1).max(80).optional(),
    price: z.number().positive().optional(),
    cost: z.number().positive().optional(),
    minStock: z.number().int().min(0).optional(),
    imageUrl: z.string().trim().min(1).max(2048).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed.",
  });

export type UpdateProductDTO = z.infer<typeof updateProductDTOSchema>;
