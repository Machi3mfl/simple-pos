import { z } from "zod";

export const openCashRegisterSessionDTOSchema = z
  .object({
    cashRegisterId: z.string().min(1),
    businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    openingFloatAmount: z.number().finite().min(0),
    openingNotes: z.string().trim().max(240).optional(),
  })
  .strict();
