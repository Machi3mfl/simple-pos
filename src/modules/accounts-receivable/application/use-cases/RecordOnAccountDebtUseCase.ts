import { DebtLedgerEntry } from "../../domain/entities/DebtLedgerEntry";
import type { DebtLedgerRepository } from "../../domain/repositories/DebtLedgerRepository";

export interface RecordOnAccountDebtUseCaseInput {
  readonly customerId: string;
  readonly saleId: string;
  readonly amount: number;
  readonly occurredAt: Date;
}

export class RecordOnAccountDebtUseCase {
  constructor(private readonly debtLedgerRepository: DebtLedgerRepository) {}

  async execute(input: RecordOnAccountDebtUseCaseInput): Promise<void> {
    const entry = DebtLedgerEntry.recordDebt({
      id: crypto.randomUUID(),
      customerId: input.customerId,
      amount: input.amount,
      occurredAt: input.occurredAt,
      orderId: input.saleId,
    });

    await this.debtLedgerRepository.append(entry);
  }
}
