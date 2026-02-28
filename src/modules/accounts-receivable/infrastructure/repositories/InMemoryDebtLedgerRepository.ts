import { DebtLedgerEntry } from "../../domain/entities/DebtLedgerEntry";
import type {
  DebtLedgerFilters,
  DebtLedgerRepository,
} from "../../domain/repositories/DebtLedgerRepository";

export class InMemoryDebtLedgerRepository implements DebtLedgerRepository {
  private static readonly entriesByCustomerId = new Map<string, DebtLedgerEntry[]>();

  async append(entry: DebtLedgerEntry): Promise<void> {
    const customerId = entry.getCustomerId();
    const existing = InMemoryDebtLedgerRepository.entriesByCustomerId.get(customerId) ?? [];
    existing.push(entry);
    InMemoryDebtLedgerRepository.entriesByCustomerId.set(customerId, existing);
  }

  async listByCustomer(
    customerId: string,
    filters: DebtLedgerFilters = {},
  ): Promise<readonly DebtLedgerEntry[]> {
    const entries = InMemoryDebtLedgerRepository.entriesByCustomerId.get(customerId) ?? [];

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
