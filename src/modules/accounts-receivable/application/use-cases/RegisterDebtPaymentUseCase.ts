import type { CustomerRepository } from "@/modules/customers/domain/repositories/CustomerRepository";

import { DebtLedgerEntry } from "../../domain/entities/DebtLedgerEntry";
import {
  CustomerNotFoundForDebtError,
  DebtOrderNotFoundError,
  DebtPaymentExceedsOrderOutstandingError,
  DebtPaymentExceedsOutstandingError,
} from "../../domain/errors/AccountsReceivableDomainError";
import type { DebtLedgerRepository } from "../../domain/repositories/DebtLedgerRepository";
import { calculateOutstandingBalance } from "../../domain/services/CalculateOutstandingBalance";
import { summarizeDebtByOrder } from "../../domain/services/SummarizeDebtByOrder";

export interface RegisterDebtPaymentUseCaseInput {
  readonly customerId: string;
  readonly amount: number;
  readonly paymentMethod: "cash";
  readonly orderId?: string;
  readonly notes?: string;
}

export interface RegisterDebtPaymentUseCaseOutput {
  readonly paymentId: string;
  readonly customerId: string;
  readonly amount: number;
  readonly orderId?: string;
  readonly createdAt: string;
}

export class RegisterDebtPaymentUseCase {
  constructor(
    private readonly debtLedgerRepository: DebtLedgerRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(
    input: RegisterDebtPaymentUseCaseInput,
  ): Promise<RegisterDebtPaymentUseCaseOutput> {
    const customer = await this.customerRepository.findById(input.customerId);
    if (!customer) {
      throw new CustomerNotFoundForDebtError(input.customerId);
    }

    const ledger = await this.debtLedgerRepository.listByCustomer(input.customerId);
    if (input.orderId) {
      const orderSnapshot = summarizeDebtByOrder(ledger).get(input.orderId);

      if (!orderSnapshot) {
        throw new DebtOrderNotFoundError(input.customerId, input.orderId);
      }

      if (input.amount > orderSnapshot.outstandingAmount) {
        throw new DebtPaymentExceedsOrderOutstandingError(
          input.orderId,
          input.amount,
          orderSnapshot.outstandingAmount,
        );
      }
    } else {
      const outstandingBalance = calculateOutstandingBalance(ledger);

      if (input.amount > outstandingBalance) {
        throw new DebtPaymentExceedsOutstandingError(input.amount, outstandingBalance);
      }
    }

    const payment = DebtLedgerEntry.recordPayment({
      id: crypto.randomUUID(),
      customerId: input.customerId,
      amount: input.amount,
      occurredAt: new Date(),
      orderId: input.orderId,
      notes: input.notes,
    });

    await this.debtLedgerRepository.append(payment);
    const primitives = payment.toPrimitives();

    return {
      paymentId: primitives.entryId,
      customerId: primitives.customerId,
      amount: primitives.amount,
      orderId: primitives.orderId,
      createdAt: primitives.occurredAt,
    };
  }
}
