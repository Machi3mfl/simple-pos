import { InvalidDebtAmountError } from "../errors/AccountsReceivableDomainError";

export type DebtLedgerEntryType = "debt" | "payment";

interface DebtLedgerEntryProps {
  readonly id: string;
  readonly customerId: string;
  readonly entryType: DebtLedgerEntryType;
  readonly amount: number;
  readonly occurredAt: Date;
  readonly orderId?: string;
  readonly notes?: string;
}

export class DebtLedgerEntry {
  private readonly props: DebtLedgerEntryProps;

  private constructor(props: DebtLedgerEntryProps) {
    this.props = props;
  }

  static recordDebt(input: {
    readonly id: string;
    readonly customerId: string;
    readonly amount: number;
    readonly occurredAt: Date;
    readonly orderId: string;
  }): DebtLedgerEntry {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new InvalidDebtAmountError();
    }

    return new DebtLedgerEntry({
      id: input.id,
      customerId: input.customerId,
      entryType: "debt",
      amount: Number(input.amount.toFixed(2)),
      occurredAt: input.occurredAt,
      orderId: input.orderId,
    });
  }

  static recordPayment(input: {
    readonly id: string;
    readonly customerId: string;
    readonly amount: number;
    readonly occurredAt: Date;
    readonly orderId?: string;
    readonly notes?: string;
  }): DebtLedgerEntry {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new InvalidDebtAmountError();
    }

    return new DebtLedgerEntry({
      id: input.id,
      customerId: input.customerId,
      entryType: "payment",
      amount: Number(input.amount.toFixed(2)),
      occurredAt: input.occurredAt,
      orderId: input.orderId,
      notes: input.notes,
    });
  }

  getCustomerId(): string {
    return this.props.customerId;
  }

  getOccurredAt(): Date {
    return this.props.occurredAt;
  }

  getSignedAmount(): number {
    return this.props.entryType === "debt" ? this.props.amount : -this.props.amount;
  }

  toPrimitives(): {
    readonly entryId: string;
    readonly customerId: string;
    readonly entryType: DebtLedgerEntryType;
    readonly orderId?: string;
    readonly amount: number;
    readonly occurredAt: string;
    readonly notes?: string;
  } {
    return {
      entryId: this.props.id,
      customerId: this.props.customerId,
      entryType: this.props.entryType,
      orderId: this.props.orderId,
      amount: this.props.amount,
      occurredAt: this.props.occurredAt.toISOString(),
      notes: this.props.notes,
    };
  }
}
