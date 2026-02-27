import { z } from "zod";

export const stockMovementTypeSchema = z.enum(["inbound", "outbound", "adjustment"]);
export type StockMovementTypeDTO = z.infer<typeof stockMovementTypeSchema>;

const baseStockMovementDTOSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  reason: z.string().min(1).optional(),
}).strict();

export const createInboundStockMovementDTOSchema = baseStockMovementDTOSchema.extend({
  movementType: z.literal("inbound"),
  unitCost: z.number().positive(),
});

export const createNonInboundStockMovementDTOSchema = baseStockMovementDTOSchema.extend({
  movementType: z.enum(["outbound", "adjustment"]),
});

export const createStockMovementDTOSchema = z.discriminatedUnion("movementType", [
  createInboundStockMovementDTOSchema,
  createNonInboundStockMovementDTOSchema,
]);

export type CreateInboundStockMovementDTO = z.infer<
  typeof createInboundStockMovementDTOSchema
>;
export type CreateNonInboundStockMovementDTO = z.infer<
  typeof createNonInboundStockMovementDTOSchema
>;
export type CreateStockMovementDTO = z.infer<typeof createStockMovementDTOSchema>;
