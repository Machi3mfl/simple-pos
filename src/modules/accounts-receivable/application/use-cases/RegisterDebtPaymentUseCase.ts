import type { CustomerRepository } from "@/modules/customers/domain/repositories/CustomerRepository";
import {
  NoopCashDebtPaymentRecorder,
  type CashDebtPaymentRecorder,
} from "../../domain/services/CashDebtPaymentRecorder";

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
  readonly cashRegisterId?: string;
  readonly actorId?: string;
  readonly accessibleRegisterIds?: readonly string[];
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
    private readonly cashDebtPaymentRecorder: CashDebtPaymentRecorder = new NoopCashDebtPaymentRecorder(),
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

    if (input.actorId && (input.cashRegisterId || (input.accessibleRegisterIds?.length ?? 0) === 1)) {
      await this.cashDebtPaymentRecorder.recordCashDebtPayment({
        paymentId: primitives.entryId,
        amount: primitives.amount,
        occurredAt: new Date(primitives.occurredAt),
        actorId: input.actorId,
        cashRegisterId: input.cashRegisterId,
        accessibleRegisterIds: input.accessibleRegisterIds,
      });
    }

    return {
      paymentId: primitives.entryId,
      customerId: primitives.customerId,
      amount: primitives.amount,
      orderId: primitives.orderId,
      createdAt: primitives.occurredAt,
    };
  }
}
