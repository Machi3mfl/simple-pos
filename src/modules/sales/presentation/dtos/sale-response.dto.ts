import { z } from "zod";

import { paymentMethodSchema } from "./create-sale.dto";

export const saleResponseDTOSchema = z.object({
  saleId: z.string().min(1),
  paymentMethod: paymentMethodSchema,
  customerId: z.string().min(1).optional(),
  total: z.number(),
  createdAt: z.string().datetime(),
}).strict();

export type SaleResponseDTO = z.infer<typeof saleResponseDTOSchema>;
