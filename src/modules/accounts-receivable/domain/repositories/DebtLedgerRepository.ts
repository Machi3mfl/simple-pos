import type { DebtLedgerEntry } from "../entities/DebtLedgerEntry";

export interface DebtLedgerFilters {
  readonly periodStart?: Date;
  readonly periodEnd?: Date;
}

export interface DebtLedgerRepository {
  append(entry: DebtLedgerEntry): Promise<void>;
  listByCustomer(
    customerId: string,
    filters?: DebtLedgerFilters,
  ): Promise<readonly DebtLedgerEntry[]>;
}
