import { z } from "zod";

export const upsertCashRegisterRequestDTOSchema = z
  .object({
    name: z.string().min(3).max(80),
    locationCode: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

