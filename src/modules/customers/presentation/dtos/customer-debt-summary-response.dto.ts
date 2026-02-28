import { z } from "zod";

export const debtLedgerEntryTypeSchema = z.enum(["debt", "payment"]);
export type DebtLedgerEntryTypeDTO = z.infer<typeof debtLedgerEntryTypeSchema>;

export const debtLedgerEntryDTOSchema = z
  .object({
    entryId: z.string().min(1),
    entryType: debtLedgerEntryTypeSchema,
    orderId: z.string().min(1).optional(),
    amount: z.number().positive(),
    occurredAt: z.string().datetime(),
  })
  .strict();

export const customerDebtSummaryResponseDTOSchema = z
  .object({
    customerId: z.string().min(1),
    customerName: z.string().min(2).max(120),
    outstandingBalance: z.number().min(0),
    ledger: z.array(debtLedgerEntryDTOSchema),
  })
  .strict();

export type DebtLedgerEntryDTO = z.infer<typeof debtLedgerEntryDTOSchema>;
export type CustomerDebtSummaryResponseDTO = z.infer<
  typeof customerDebtSummaryResponseDTOSchema
>;
