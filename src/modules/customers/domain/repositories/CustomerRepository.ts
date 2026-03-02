import type { Customer } from "../entities/Customer";

export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findByName(name: string): Promise<Customer | null>;
  searchByName(query: string, limit: number): Promise<readonly Customer[]>;
  listRecent(limit: number): Promise<readonly Customer[]>;
  save(customer: Customer): Promise<void>;
}
