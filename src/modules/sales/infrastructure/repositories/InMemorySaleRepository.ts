import { getMockStore } from "@/infrastructure/config/mockStore";

import type { Sale } from "../../domain/entities/Sale";
import type { SaleFilters, SaleRepository } from "../../domain/repositories/SaleRepository";

export class InMemorySaleRepository implements SaleRepository {
  async save(sale: Sale): Promise<void> {
    getMockStore().sales.push(sale);
  }

  async list(filters: SaleFilters = {}): Promise<readonly Sale[]> {
    return getMockStore()
      .sales
      .filter((sale) => {
        if (filters.paymentMethod && sale.getPaymentMethod() !== filters.paymentMethod) {
          return false;
        }

        const occurredAt = sale.getCreatedAt();
        if (filters.periodStart && occurredAt < filters.periodStart) {
          return false;
        }

        if (filters.periodEnd && occurredAt > filters.periodEnd) {
          return false;
        }

        return true;
      })
      .sort((left, right) => right.getCreatedAt().getTime() - left.getCreatedAt().getTime());
  }
}
