import type { Customer } from "../../domain/entities/Customer";
import type { CustomerRepository } from "../../domain/repositories/CustomerRepository";

export interface SearchCustomersUseCaseInput {
  readonly query?: string;
  readonly limit?: number;
}

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 12;

function sanitizeLimit(limit?: number): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit as number)));
}

export class SearchCustomersUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(input: SearchCustomersUseCaseInput): Promise<readonly Customer[]> {
    const limit = sanitizeLimit(input.limit);
    const query = input.query?.trim() ?? "";

    if (query.length === 0) {
      return this.customerRepository.listRecent(limit);
    }

    if (query.length < 2) {
      return [];
    }

    return this.customerRepository.searchByName(query, limit);
  }
}
