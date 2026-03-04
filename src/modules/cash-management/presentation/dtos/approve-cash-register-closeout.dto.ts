import { z } from "zod";

export const approveCashRegisterCloseoutDTOSchema = z
  .object({
    approvalNotes: z.string().trim().max(240).optional(),
  })
  .strict();
