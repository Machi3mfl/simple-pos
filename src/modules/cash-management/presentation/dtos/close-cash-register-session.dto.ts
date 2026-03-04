import { z } from "zod";

export const closeCashRegisterSessionDTOSchema = z
  .object({
    countedClosingAmount: z.number().finite().min(0),
    closingNotes: z.string().trim().max(240).optional(),
  })
  .strict();
