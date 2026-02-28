import type { DebtLedgerEntry } from "../entities/DebtLedgerEntry";

export function calculateOutstandingBalance(
  entries: readonly DebtLedgerEntry[],
): number {
  const total = entries.reduce((sum, entry) => sum + entry.getSignedAmount(), 0);
  return Number(total.toFixed(2));
}
