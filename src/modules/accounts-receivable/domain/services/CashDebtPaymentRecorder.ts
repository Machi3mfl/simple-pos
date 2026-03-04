export interface RecordCashDebtPaymentInput {
  readonly paymentId: string;
  readonly amount: number;
  readonly occurredAt: Date;
  readonly actorId: string;
  readonly cashRegisterId?: string;
  readonly accessibleRegisterIds?: readonly string[];
}

export interface CashDebtPaymentRecorder {
  recordCashDebtPayment(input: RecordCashDebtPaymentInput): Promise<void>;
}

export class NoopCashDebtPaymentRecorder implements CashDebtPaymentRecorder {
  async recordCashDebtPayment(): Promise<void> {}
}
