import { z } from "zod";

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
    status: cashRegisterSessionStatusDTOSchema,
    openingFloatAmount: z.number().finite(),
    expectedBalanceAmount: z.number().finite(),
    countedClosingAmount: z.number().finite().optional(),
    discrepancyAmount: z.number().finite().optional(),
    openedAt: z.string().datetime(),
    openedByUserId: z.string().min(1),
    openedByDisplayName: z.string().min(1),
    closedAt: z.string().datetime().optional(),
    closedByUserId: z.string().min(1).optional(),
    closedByDisplayName: z.string().min(1).optional(),
    openingNotes: z.string().min(1).optional(),
    closingNotes: z.string().min(1).optional(),
  })
  .strict();

export const activeCashRegisterSessionResponseDTOSchema = z
  .object({
    session: cashRegisterSessionResponseDTOSchema.nullable(),
  })
  .strict();

export type CashRegisterSessionResponseDTO = z.infer<
  typeof cashRegisterSessionResponseDTOSchema
>;
