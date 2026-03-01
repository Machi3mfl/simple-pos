import { getMockStore } from "@/infrastructure/config/mockStore";

import { DebtLedgerEntry } from "../../domain/entities/DebtLedgerEntry";
import type {
  DebtLedgerFilters,
  DebtLedgerRepository,
} from "../../domain/repositories/DebtLedgerRepository";

export class InMemoryDebtLedgerRepository implements DebtLedgerRepository {
  async append(entry: DebtLedgerEntry): Promise<void> {
    const customerId = entry.getCustomerId();
    const existing = getMockStore().debtEntriesByCustomerId.get(customerId) ?? [];
    existing.push(entry);
    getMockStore().debtEntriesByCustomerId.set(customerId, existing);
  }

  async listByCustomer(
    customerId: string,
    filters: DebtLedgerFilters = {},
  ): Promise<readonly DebtLedgerEntry[]> {
    const entries = getMockStore().debtEntriesByCustomerId.get(customerId) ?? [];

    return entries
      .filter((entry) => {
        const occurredAt = entry.getOccurredAt();

        if (filters.periodStart && occurredAt < filters.periodStart) {
          return false;
        }

        if (filters.periodEnd && occurredAt > filters.periodEnd) {
          return false;
        }

        return true;
      })
      .sort((left, right) => right.getOccurredAt().getTime() - left.getOccurredAt().getTime());
  }
}
