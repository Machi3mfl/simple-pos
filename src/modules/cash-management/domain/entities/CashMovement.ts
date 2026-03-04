import { CashManagementDomainError } from "../errors/CashManagementDomainError";

export type CashMovementType =
  | "opening_float"
  | "cash_sale"
  | "debt_payment_cash"
  | "cash_paid_in"
  | "cash_paid_out"
  | "safe_drop"
  | "refund_cash"
  | "adjustment";

export type CashMovementDirection = "inbound" | "outbound";

export interface CashMovementPrimitives {
  readonly id: string;
  readonly cashRegisterSessionId: string;
  readonly cashRegisterId: string;
  readonly movementType: CashMovementType;
  readonly direction: CashMovementDirection;
  readonly amount: number;
  readonly reasonCode?: string;
  readonly notes?: string;
  readonly saleId?: string;
  readonly debtLedgerEntryId?: string;
  readonly occurredAt: Date;
  readonly performedByUserId: string;
}

function roundMonetaryAmount(amount: number): number {
  return Number(amount.toFixed(4));
}

export class CashMovement {
  private constructor(private readonly props: CashMovementPrimitives) {}

  static record(input: CashMovementPrimitives): CashMovement {
    if (input.id.trim().length === 0) {
      throw new CashManagementDomainError("El movimiento de caja debe tener un id.");
    }

    if (input.cashRegisterSessionId.trim().length === 0) {
      throw new CashManagementDomainError(
        "El movimiento de caja debe apuntar a una sesión.",
      );
    }

    if (input.cashRegisterId.trim().length === 0) {
      throw new CashManagementDomainError(
        "El movimiento de caja debe apuntar a una caja.",
      );
    }

    if (input.performedByUserId.trim().length === 0) {
      throw new CashManagementDomainError(
        "El movimiento de caja debe registrar el actor.",
      );
    }

    if (!Number.isFinite(input.amount) || input.amount < 0) {
      throw new CashManagementDomainError(
        "El monto del movimiento de caja debe ser mayor o igual a cero.",
      );
    }

    return new CashMovement({
      ...input,
      amount: roundMonetaryAmount(input.amount),
      reasonCode: input.reasonCode?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
    });
  }

  toPrimitives(): CashMovementPrimitives {
    return { ...this.props };
  }
}
