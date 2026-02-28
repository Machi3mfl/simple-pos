import type {
  OnAccountDebtRecorder,
  RecordOnAccountDebtInput,
} from "@/modules/sales/domain/services/OnAccountDebtRecorder";

import { RecordOnAccountDebtUseCase } from "../use-cases/RecordOnAccountDebtUseCase";

export class OnAccountDebtRecorderAdapter implements OnAccountDebtRecorder {
  constructor(
    private readonly recordOnAccountDebtUseCase: RecordOnAccountDebtUseCase,
  ) {}

  async recordOnAccountDebt(input: RecordOnAccountDebtInput): Promise<void> {
    await this.recordOnAccountDebtUseCase.execute({
      customerId: input.customerId,
      saleId: input.saleId,
      amount: input.amount,
      occurredAt: input.occurredAt,
    });
  }
}
