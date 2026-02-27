import { z } from "zod";

import { stockMovementTypeSchema } from "./create-stock-movement.dto";

export const stockMovementResponseDTOSchema = z.object({
  movementId: z.string().min(1),
  productId: z.string().min(1),
  movementType: stockMovementTypeSchema,
  quantity: z.number().positive(),
  unitCost: z.number().positive().optional(),
  occurredAt: z.string().datetime(),
}).strict();

export type StockMovementResponseDTO = z.infer<typeof stockMovementResponseDTOSchema>;
