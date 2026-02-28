import { z } from "zod";

export const createProductDTOSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    categoryId: z.string().trim().min(1).max(80),
    price: z.number().positive(),
    cost: z.number().positive().optional(),
    initialStock: z.number().int().min(0),
    imageUrl: z.string().trim().min(1).max(2048).optional(),
  })
  .strict();

export type CreateProductDTO = z.infer<typeof createProductDTOSchema>;
