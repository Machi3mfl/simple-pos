import { z } from "zod";

export const topProductItemDTOSchema = z
  .object({
    productId: z.string().min(1),
    name: z.string().min(1),
    quantitySold: z.number().int().min(0),
    revenue: z.number().min(0),
  })
  .strict();

export const topProductsResponseDTOSchema = z
  .object({
    items: z.array(topProductItemDTOSchema),
  })
  .strict();

export type TopProductItemDTO = z.infer<typeof topProductItemDTOSchema>;
export type TopProductsResponseDTO = z.infer<typeof topProductsResponseDTOSchema>;
