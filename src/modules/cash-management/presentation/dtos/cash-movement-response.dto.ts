import { z } from "zod";

export const cashMovementTypeDTOSchema = z.enum([
  "opening_float",
  "cash_sale",
  "debt_payment_cash",
  "cash_paid_in",
  "cash_paid_out",
  "safe_drop",
  "refund_cash",
  "adjustment",
]);

export const cashMovementDirectionDTOSchema = z.enum(["inbound", "outbound"]);

export const cashMovementResponseDTOSchema = z
  .object({
    id: z.string().min(1),
    movementType: cashMovementTypeDTOSchema,
    direction: cashMovementDirectionDTOSchema,
    amount: z.number().finite(),
    reasonCode: z.string().min(1).optional(),
    notes: z.string().min(1).optional(),
    saleId: z.string().min(1).optional(),
    debtLedgerEntryId: z.string().min(1).optional(),
    occurredAt: z.string().datetime(),
    performedByUserId: z.string().min(1),
    performedByDisplayName: z.string().min(1),
  })
  .strict();

export type CashMovementResponseDTO = z.infer<typeof cashMovementResponseDTOSchema>;
