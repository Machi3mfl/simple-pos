import type {
  CashDebtPaymentRecorder,
  RecordCashDebtPaymentInput,
} from "@/modules/accounts-receivable/domain/services/CashDebtPaymentRecorder";

import { RecordAutomaticCashMovementUseCase } from "../use-cases/RecordAutomaticCashMovementUseCase";

export class CashDebtPaymentRecorderAdapter implements CashDebtPaymentRecorder {
  constructor(
    private readonly recordAutomaticCashMovementUseCase: RecordAutomaticCashMovementUseCase,
  ) {}

  async recordCashDebtPayment(input: RecordCashDebtPaymentInput): Promise<void> {
    await this.recordAutomaticCashMovementUseCase.execute({
      movementType: "debt_payment_cash",
      debtLedgerEntryId: input.paymentId,
      amount: input.amount,
      occurredAt: input.occurredAt,
      actorId: input.actorId,
      cashRegisterId: input.cashRegisterId,
      accessibleRegisterIds: input.accessibleRegisterIds,
    });
  }
}
