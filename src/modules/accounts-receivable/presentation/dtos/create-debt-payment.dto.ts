import { z } from "zod";

export const createDebtPaymentDTOSchema = z.object({
  customerId: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.literal("cash"),
  orderId: z.string().min(1).optional(),
  notes: z.string().max(500).optional(),
}).strict();

export type CreateDebtPaymentDTO = z.infer<typeof createDebtPaymentDTOSchema>;
