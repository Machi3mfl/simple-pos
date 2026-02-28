export interface RecordOnAccountDebtInput {
  readonly saleId: string;
  readonly customerId: string;
  readonly amount: number;
  readonly occurredAt: Date;
}

export interface OnAccountDebtRecorder {
  recordOnAccountDebt(input: RecordOnAccountDebtInput): Promise<void>;
}

export class NoopOnAccountDebtRecorder implements OnAccountDebtRecorder {
  async recordOnAccountDebt(): Promise<void> {}
}
