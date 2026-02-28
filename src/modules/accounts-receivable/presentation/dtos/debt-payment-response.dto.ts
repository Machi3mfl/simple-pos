import { z } from "zod";

export const debtPaymentResponseDTOSchema = z
  .object({
    paymentId: z.string().min(1),
    customerId: z.string().min(1),
    amount: z.number().positive(),
    createdAt: z.string().datetime(),
  })
  .strict();

export type DebtPaymentResponseDTO = z.infer<typeof debtPaymentResponseDTOSchema>;
