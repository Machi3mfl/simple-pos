import { z } from "zod";

export const profitSummaryResponseDTOSchema = z
  .object({
    revenue: z.number(),
    cost: z.number(),
    profit: z.number(),
  })
  .strict();

export type ProfitSummaryResponseDTO = z.infer<typeof profitSummaryResponseDTOSchema>;
