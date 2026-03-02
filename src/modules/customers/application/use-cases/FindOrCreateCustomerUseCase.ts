import { Customer } from "../../domain/entities/Customer";
import type { CustomerRepository } from "../../domain/repositories/CustomerRepository";
import {
  isPotentialCustomerNameMatch,
  normalizeCustomerName,
  scoreCustomerNameMatch,
} from "../../domain/services/normalizeCustomerName";

export interface FindOrCreateCustomerInput {
  readonly customerId?: string;
  readonly customerName?: string;
  readonly createCustomerIfMissing?: boolean;
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

    const rawCustomerName = input.customerName.trim();
    const normalizedName = normalizeCustomerName(rawCustomerName);
    if (normalizedName.length < 2) {
      throw new Error("Customer name must have at least 2 characters.");
    }

    const existingByName = await this.customerRepository.findByName(rawCustomerName);
    if (existingByName) {
      return existingByName;
    }

    if (!input.createCustomerIfMissing) {
      const similarCustomers = await this.findPotentialMatches(rawCustomerName);
      if (similarCustomers.length > 0) {
        throw new Error(
          `Ya existen clientes parecidos: ${similarCustomers
            .map((customer) => customer.getName())
            .join(", ")}. Seleccioná uno existente o confirmá crear uno nuevo.`,
        );
      }

      throw new Error(
        "Seleccioná un cliente existente o confirmá crear uno nuevo antes de cobrar.",
      );
    }

    const customer = Customer.create({
      id: crypto.randomUUID(),
      name: rawCustomerName,
      createdAt: new Date(),
    });
    await this.customerRepository.save(customer);

    return customer;
  }

  private async findPotentialMatches(customerName: string): Promise<readonly Customer[]> {
    const normalizedName = normalizeCustomerName(customerName);
    const probes = Array.from(
      new Set(
        [normalizedName, normalizedName.slice(0, Math.min(4, normalizedName.length))].filter(
          (value) => value.length >= 2,
        ),
      ),
    );

    const matchesById = new Map<string, Customer>();
    for (const probe of probes) {
      const matches = await this.customerRepository.searchByName(probe, 6);
      for (const customer of matches) {
        if (!isPotentialCustomerNameMatch(customer.getName(), normalizedName)) {
          continue;
        }

        matchesById.set(customer.getId(), customer);
      }
    }

    return Array.from(matchesById.values()).sort((left, right) => {
      const scoreDifference =
        scoreCustomerNameMatch(left.getName(), normalizedName) -
        scoreCustomerNameMatch(right.getName(), normalizedName);
      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return left.getName().localeCompare(right.getName(), "es");
    });
  }
}
