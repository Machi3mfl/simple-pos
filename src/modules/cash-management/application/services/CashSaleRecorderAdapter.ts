import type {
  CashSaleRecorder,
  RecordCashSaleInput,
} from "@/modules/sales/domain/services/CashSaleRecorder";

import { RecordAutomaticCashMovementUseCase } from "../use-cases/RecordAutomaticCashMovementUseCase";

export class CashSaleRecorderAdapter implements CashSaleRecorder {
  constructor(
    private readonly recordAutomaticCashMovementUseCase: RecordAutomaticCashMovementUseCase,
  ) {}

  async recordCashSale(input: RecordCashSaleInput): Promise<void> {
    await this.recordAutomaticCashMovementUseCase.execute({
      movementType: "cash_sale",
      saleId: input.saleId,
      amount: input.amount,
      occurredAt: input.occurredAt,
      actorId: input.actorId,
      cashRegisterId: input.cashRegisterId,
      accessibleRegisterIds: input.accessibleRegisterIds,
    });
  }
}
