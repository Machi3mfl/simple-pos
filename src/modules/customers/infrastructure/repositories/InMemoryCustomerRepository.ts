import { getMockStore } from "@/infrastructure/config/mockStore";

import type { Customer } from "../../domain/entities/Customer";
import type { CustomerRepository } from "../../domain/repositories/CustomerRepository";

export class InMemoryCustomerRepository implements CustomerRepository {
  async findById(id: string): Promise<Customer | null> {
    return getMockStore().customersById.get(id) ?? null;
  }

  async findByName(name: string): Promise<Customer | null> {
    const normalizedTarget = name.trim().toLowerCase();

    for (const customer of Array.from(getMockStore().customersById.values())) {
      if (customer.getName().toLowerCase() === normalizedTarget) {
        return customer;
      }
    }

    return null;
  }

  async save(customer: Customer): Promise<void> {
    getMockStore().customersById.set(customer.getId(), customer);
  }
}
