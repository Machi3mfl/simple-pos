import { Customer } from "../../domain/entities/Customer";
import type { CustomerRepository } from "../../domain/repositories/CustomerRepository";

export interface FindOrCreateCustomerInput {
  readonly customerId?: string;
  readonly customerName?: string;
}

export class FindOrCreateCustomerUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(input: FindOrCreateCustomerInput): Promise<Customer | null> {
    if (input.customerId) {
      const existingCustomer = await this.customerRepository.findById(input.customerId);

      if (!existingCustomer) {
        throw new Error("Customer not found.");
      }

      return existingCustomer;
    }

    if (!input.customerName) {
      return null;
    }

    const normalizedName = input.customerName.trim();
    if (normalizedName.length < 2) {
      throw new Error("Customer name must have at least 2 characters.");
    }

    const existingByName = await this.customerRepository.findByName(normalizedName);
    if (existingByName) {
      return existingByName;
    }

    const customer = Customer.create({
      id: crypto.randomUUID(),
      name: normalizedName,
      createdAt: new Date(),
    });
    await this.customerRepository.save(customer);

    return customer;
  }
}
