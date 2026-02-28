import type { CustomerRepository } from "@/modules/customers/domain/repositories/CustomerRepository";

import { CustomerNotFoundForDebtError } from "../../domain/errors/AccountsReceivableDomainError";
import type { DebtLedgerRepository } from "../../domain/repositories/DebtLedgerRepository";
import { calculateOutstandingBalance } from "../../domain/services/CalculateOutstandingBalance";

export interface GetCustomerDebtSummaryUseCaseInput {
  readonly customerId: string;
  readonly periodStart?: Date;
  readonly periodEnd?: Date;
}

export interface GetCustomerDebtSummaryUseCaseOutput {
  readonly customerId: string;
  readonly outstandingBalance: number;
  readonly ledger: ReadonlyArray<{
    readonly entryId: string;
    readonly entryType: "debt" | "payment";
    readonly orderId?: string;
    readonly amount: number;
    readonly occurredAt: string;
  }>;
}

export class GetCustomerDebtSummaryUseCase {
  constructor(
    private readonly debtLedgerRepository: DebtLedgerRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(
    input: GetCustomerDebtSummaryUseCaseInput,
  ): Promise<GetCustomerDebtSummaryUseCaseOutput> {
    const customer = await this.customerRepository.findById(input.customerId);
    if (!customer) {
      throw new CustomerNotFoundForDebtError(input.customerId);
    }

    const fullLedger = await this.debtLedgerRepository.listByCustomer(input.customerId);
    const filteredLedger = await this.debtLedgerRepository.listByCustomer(input.customerId, {
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    });

    return {
      customerId: input.customerId,
      outstandingBalance: calculateOutstandingBalance(fullLedger),
      ledger: filteredLedger.map((entry) => ({
        entryId: entry.toPrimitives().entryId,
        entryType: entry.toPrimitives().entryType,
        orderId: entry.toPrimitives().orderId,
        amount: entry.toPrimitives().amount,
        occurredAt: entry.toPrimitives().occurredAt,
      })),
    };
  }
}
