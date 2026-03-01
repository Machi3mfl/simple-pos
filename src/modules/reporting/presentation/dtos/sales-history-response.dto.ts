import { z } from "zod";

export const saleHistoryItemDTOSchema = z
  .object({
    saleId: z.string().min(1),
    paymentMethod: z.enum(["cash", "on_account"]),
    customerId: z.string().min(1).optional(),
    customerName: z.string().min(2).max(120).optional(),
    total: z.number().min(0),
    amountPaid: z.number().min(0),
    outstandingAmount: z.number().min(0),
    paymentStatus: z.enum(["paid", "partial", "pending"]),
    itemCount: z.number().int().min(0),
    createdAt: z.string().datetime(),
  })
  .strict();

export const salesHistoryResponseDTOSchema = z
  .object({
    items: z.array(saleHistoryItemDTOSchema),
  })
  .strict();

export type SaleHistoryItemDTO = z.infer<typeof saleHistoryItemDTOSchema>;
export type SalesHistoryResponseDTO = z.infer<typeof salesHistoryResponseDTOSchema>;
