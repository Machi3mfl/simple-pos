import { z } from "zod";
import { DEFAULT_PRODUCT_MIN_STOCK } from "@/modules/catalog/domain/constants/ProductDefaults";

export const createProductDTOSchema = z
  .object({
    sku: z.string().trim().min(1).max(40).optional(),
    ean: z.string().trim().regex(/^[0-9]{8,18}$/).optional(),
    name: z.string().trim().min(2).max(120),
    categoryId: z.string().trim().min(1).max(80),
    price: z.number().positive(),
    cost: z.number().positive().optional(),
    initialStock: z.number().int().min(0),
    minStock: z.number().int().min(0).default(DEFAULT_PRODUCT_MIN_STOCK),
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
