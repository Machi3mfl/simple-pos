import { z } from "zod";

import { cashMovementResponseDTOSchema } from "./cash-movement-response.dto";

export const cashRegisterSessionStatusDTOSchema = z.enum([
  "open",
  "closing_review_required",
  "closed",
  "voided",
]);

export const cashRegisterSessionResponseDTOSchema = z
  .object({
    id: z.string().min(1),
    cashRegisterId: z.string().min(1),
    businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: cashRegisterSessionStatusDTOSchema,
    openingFloatAmount: z.number().finite(),
    expectedBalanceAmount: z.number().finite(),
    countedClosingAmount: z.number().finite().optional(),
    discrepancyAmount: z.number().finite().optional(),
    openedAt: z.string().datetime(),
    openedByUserId: z.string().min(1),
    openedByDisplayName: z.string().min(1),
    closeoutSubmittedAt: z.string().datetime().optional(),
    closeoutSubmittedByUserId: z.string().min(1).optional(),
    closeoutSubmittedByDisplayName: z.string().min(1).optional(),
    closedAt: z.string().datetime().optional(),
    closedByUserId: z.string().min(1).optional(),
    closedByDisplayName: z.string().min(1).optional(),
    discrepancyApprovedAt: z.string().datetime().optional(),
    discrepancyApprovedByUserId: z.string().min(1).optional(),
    discrepancyApprovedByDisplayName: z.string().min(1).optional(),
    discrepancyApprovalNotes: z.string().min(1).optional(),
    openingNotes: z.string().min(1).optional(),
    closingNotes: z.string().min(1).optional(),
  })
  .strict();

export const cashRegisterSessionDetailResponseDTOSchema =
  cashRegisterSessionResponseDTOSchema
    .extend({
      movements: z.array(cashMovementResponseDTOSchema),
    })
    .strict();

export const activeCashRegisterSessionResponseDTOSchema = z
  .object({
    session: cashRegisterSessionDetailResponseDTOSchema.nullable(),
  })
  .strict();

export type CashRegisterSessionResponseDTO = z.infer<
  typeof cashRegisterSessionResponseDTOSchema
>;
export type ActiveCashRegisterSessionResponseDTO = z.infer<
  typeof activeCashRegisterSessionResponseDTOSchema
>;
export type CashRegisterSessionDetailResponseDTO = z.infer<
  typeof cashRegisterSessionDetailResponseDTOSchema
>;
