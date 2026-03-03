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
    notes: z.string().max(500).optional(),
  })
  .strict();

export const customerDebtOrderSummaryDTOSchema = z
  .object({
    orderId: z.string().min(1),
    totalAmount: z.number().min(0),
    amountPaid: z.number().min(0),
    outstandingAmount: z.number().min(0),
    createdAt: z.string().datetime().optional(),
    itemCount: z.number().int().min(0).optional(),
    saleItems: z.array(
      z
        .object({
          productId: z.string().min(1),
          productName: z.string().min(1).optional(),
          productImageUrl: z.string().min(1).optional(),
          quantity: z.number().int().positive(),
          unitPrice: z.number().min(0),
          lineTotal: z.number().min(0),
        })
        .strict(),
    ),
  })
  .strict();

export const customerDebtSummaryResponseDTOSchema = z
  .object({
    customerId: z.string().min(1),
    customerName: z.string().min(2).max(120),
    outstandingBalance: z.number().min(0),
    totalDebtAmount: z.number().min(0),
    totalPaidAmount: z.number().min(0),
    openOrderCount: z.number().int().min(0),
    lastActivityAt: z.string().datetime(),
    orders: z.array(customerDebtOrderSummaryDTOSchema),
    ledger: z.array(debtLedgerEntryDTOSchema),
  })
  .strict();

export type DebtLedgerEntryDTO = z.infer<typeof debtLedgerEntryDTOSchema>;
export type CustomerDebtOrderSummaryDTO = z.infer<typeof customerDebtOrderSummaryDTOSchema>;
export type CustomerDebtSummaryResponseDTO = z.infer<
  typeof customerDebtSummaryResponseDTOSchema
>;
