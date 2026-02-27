export type DebtLedgerEntryTypeDTO = "debt" | "payment";

export interface DebtLedgerEntryDTO {
  readonly entryId: string;
  readonly entryType: DebtLedgerEntryTypeDTO;
  readonly orderId?: string;
  readonly amount: number;
  readonly occurredAt: string;
}

export interface CustomerDebtSummaryResponseDTO {
  readonly customerId: string;
  readonly outstandingBalance: number;
  readonly ledger: DebtLedgerEntryDTO[];
}
