import { z } from "zod";

export const createProductDTOSchema = z
  .object({
    sku: z.string().trim().min(1).max(40).optional(),
    name: z.string().trim().min(2).max(120),
    categoryId: z.string().trim().min(1).max(80),
    price: z.number().positive(),
    cost: z.number().positive().optional(),
    initialStock: z.number().int().min(0),
    minStock: z.number().int().min(0).default(0),
    imageUrl: z.string().trim().min(1).max(2048).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.initialStock > 0 && value.cost === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cost"],
        message: "cost is required when initialStock is greater than 0",
      });
    }
  });

export type CreateProductDTO = z.infer<typeof createProductDTOSchema>;
