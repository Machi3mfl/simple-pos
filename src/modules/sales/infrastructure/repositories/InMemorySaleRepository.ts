import type { Sale } from "../../domain/entities/Sale";
import type { SaleRepository } from "../../domain/repositories/SaleRepository";

export class InMemorySaleRepository implements SaleRepository {
  private readonly storage: Sale[] = [];

  async save(sale: Sale): Promise<void> {
    this.storage.push(sale);
  }
}
