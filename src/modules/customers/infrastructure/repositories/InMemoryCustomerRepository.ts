import type { Customer } from "../../domain/entities/Customer";
import type { CustomerRepository } from "../../domain/repositories/CustomerRepository";

export class InMemoryCustomerRepository implements CustomerRepository {
  private static readonly storage = new Map<string, Customer>();

  async findById(id: string): Promise<Customer | null> {
    return InMemoryCustomerRepository.storage.get(id) ?? null;
  }

  async findByName(name: string): Promise<Customer | null> {
    const normalizedTarget = name.trim().toLowerCase();

    for (const customer of Array.from(InMemoryCustomerRepository.storage.values())) {
      if (customer.getName().toLowerCase() === normalizedTarget) {
        return customer;
      }
    }

    return null;
  }

  async save(customer: Customer): Promise<void> {
    InMemoryCustomerRepository.storage.set(customer.getId(), customer);
  }
}
