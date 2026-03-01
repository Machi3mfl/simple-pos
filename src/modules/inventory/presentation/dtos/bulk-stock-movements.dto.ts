import { z } from "zod";

import { createStockMovementDTOSchema } from "./create-stock-movement.dto";
import { stockMovementResponseDTOSchema } from "./stock-movement-response.dto";

export const bulkStockMovementsDTOSchema = z
  .object({
    items: z.array(createStockMovementDTOSchema).min(1),
  })
  .strict();

export const bulkStockMovementsResponseDTOSchema = z
  .object({
    appliedCount: z.number().int().min(0),
    items: z.array(stockMovementResponseDTOSchema),
    invalidItems: z
      .array(
        z
          .object({
            row: z.number().int().positive(),
            productId: z.string().min(1),
            reason: z.string().min(1),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();

export type BulkStockMovementsDTO = z.infer<typeof bulkStockMovementsDTOSchema>;
export type BulkStockMovementsResponseDTO = z.infer<
  typeof bulkStockMovementsResponseDTOSchema
>;
