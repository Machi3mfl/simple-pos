import type { Customer } from "../entities/Customer";

export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findByName(name: string): Promise<Customer | null>;
  save(customer: Customer): Promise<void>;
}
