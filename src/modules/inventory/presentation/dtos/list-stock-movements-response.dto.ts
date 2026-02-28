import { z } from "zod";

import { stockMovementTypeSchema } from "./create-stock-movement.dto";

export const stockMovementHistoryItemDTOSchema = z
  .object({
    movementId: z.string().min(1),
    productId: z.string().min(1),
    movementType: stockMovementTypeSchema,
    quantity: z.number().positive(),
    unitCost: z.number().positive(),
    occurredAt: z.string().datetime(),
    stockOnHandAfter: z.number().min(0),
    weightedAverageUnitCostAfter: z.number().min(0),
    inventoryValueAfter: z.number().min(0),
    reason: z.string().min(1).optional(),
  })
  .strict();

export const listStockMovementsResponseDTOSchema = z
  .object({
    items: z.array(stockMovementHistoryItemDTOSchema),
  })
  .strict();

export type StockMovementHistoryItemDTO = z.infer<
  typeof stockMovementHistoryItemDTOSchema
>;
export type ListStockMovementsResponseDTO = z.infer<
  typeof listStockMovementsResponseDTOSchema
>;
