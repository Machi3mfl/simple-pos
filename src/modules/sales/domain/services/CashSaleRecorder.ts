export interface RecordCashSaleInput {
  readonly saleId: string;
  readonly amount: number;
  readonly occurredAt: Date;
  readonly actorId: string;
  readonly cashRegisterId?: string;
  readonly accessibleRegisterIds?: readonly string[];
}

export interface CashSaleRecorder {
  recordCashSale(input: RecordCashSaleInput): Promise<void>;
}

export class NoopCashSaleRecorder implements CashSaleRecorder {
  async recordCashSale(): Promise<void> {}
}
