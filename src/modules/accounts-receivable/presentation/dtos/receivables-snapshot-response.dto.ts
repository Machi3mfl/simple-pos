import { z } from "zod";

export const receivableSnapshotItemDTOSchema = z
  .object({
    customerId: z.string().min(1),
    customerName: z.string().min(2).max(120),
    outstandingBalance: z.number().min(0),
    totalDebtAmount: z.number().min(0),
    totalPaidAmount: z.number().min(0),
    openOrderCount: z.number().int().min(0),
    lastActivityAt: z.string().datetime(),
  })
  .strict();

export const receivablesSnapshotResponseDTOSchema = z
  .object({
    items: z.array(receivableSnapshotItemDTOSchema),
  })
  .strict();

export type ReceivableSnapshotItemDTO = z.infer<typeof receivableSnapshotItemDTOSchema>;
export type ReceivablesSnapshotResponseDTO = z.infer<
  typeof receivablesSnapshotResponseDTOSchema
>;
