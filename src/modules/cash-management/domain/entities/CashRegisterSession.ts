import {
  CashManagementDomainError,
  CashRegisterSessionStatusError,
} from "../errors/CashManagementDomainError";
import type { CashMovementDirection } from "./CashMovement";

export type CashRegisterSessionStatus =
  | "open"
  | "closing_review_required"
  | "closed"
  | "voided";

export interface CashRegisterSessionPrimitives {
  readonly id: string;
  readonly cashRegisterId: string;
  readonly status: CashRegisterSessionStatus;
  readonly openingFloatAmount: number;
  readonly expectedBalanceAmount: number;
  readonly countedClosingAmount?: number;
  readonly discrepancyAmount?: number;
  readonly openedAt: Date;
  readonly openedByUserId: string;
  readonly closeoutSubmittedAt?: Date;
  readonly closeoutSubmittedByUserId?: string;
  readonly closedAt?: Date;
  readonly closedByUserId?: string;
  readonly discrepancyApprovedAt?: Date;
  readonly discrepancyApprovedByUserId?: string;
  readonly discrepancyApprovalNotes?: string;
  readonly openingNotes?: string;
  readonly closingNotes?: string;
}

function roundMonetaryAmount(amount: number): number {
  return Number(amount.toFixed(4));
}

export class CashRegisterSession {
  private constructor(private readonly props: CashRegisterSessionPrimitives) {}

  static open(input: {
    readonly id: string;
    readonly cashRegisterId: string;
    readonly openingFloatAmount: number;
    readonly openedAt: Date;
    readonly openedByUserId: string;
    readonly openingNotes?: string;
  }): CashRegisterSession {
    if (input.id.trim().length === 0) {
      throw new CashManagementDomainError("La sesión de caja debe tener un id.");
    }

    if (input.cashRegisterId.trim().length === 0) {
      throw new CashManagementDomainError("La sesión de caja debe indicar una caja.");
    }

    if (input.openedByUserId.trim().length === 0) {
      throw new CashManagementDomainError("La sesión de caja debe registrar un actor.");
    }

    if (!Number.isFinite(input.openingFloatAmount) || input.openingFloatAmount < 0) {
      throw new CashManagementDomainError(
        "El cambio inicial debe ser mayor o igual a cero.",
      );
    }

    const roundedOpeningFloat = roundMonetaryAmount(input.openingFloatAmount);

    return new CashRegisterSession({
      id: input.id.trim(),
      cashRegisterId: input.cashRegisterId.trim(),
      status: "open",
      openingFloatAmount: roundedOpeningFloat,
      expectedBalanceAmount: roundedOpeningFloat,
      openedAt: input.openedAt,
      openedByUserId: input.openedByUserId.trim(),
      openingNotes: input.openingNotes?.trim() || undefined,
    });
  }

  static rehydrate(input: CashRegisterSessionPrimitives): CashRegisterSession {
    return new CashRegisterSession({
      ...input,
      openingFloatAmount: roundMonetaryAmount(input.openingFloatAmount),
      expectedBalanceAmount: roundMonetaryAmount(input.expectedBalanceAmount),
      countedClosingAmount:
        typeof input.countedClosingAmount === "number"
          ? roundMonetaryAmount(input.countedClosingAmount)
          : undefined,
      discrepancyAmount:
        typeof input.discrepancyAmount === "number"
          ? roundMonetaryAmount(input.discrepancyAmount)
          : undefined,
      closeoutSubmittedByUserId: input.closeoutSubmittedByUserId?.trim() || undefined,
      openingNotes: input.openingNotes?.trim() || undefined,
      discrepancyApprovedByUserId:
        input.discrepancyApprovedByUserId?.trim() || undefined,
      discrepancyApprovalNotes: input.discrepancyApprovalNotes?.trim() || undefined,
      closingNotes: input.closingNotes?.trim() || undefined,
      closedByUserId: input.closedByUserId?.trim() || undefined,
    });
  }

  getId(): string {
    return this.props.id;
  }

  getCashRegisterId(): string {
    return this.props.cashRegisterId;
  }

  getStatus(): CashRegisterSessionStatus {
    return this.props.status;
  }

  isOpen(): boolean {
    return this.props.status === "open";
  }

  isClosingReviewRequired(): boolean {
    return this.props.status === "closing_review_required";
  }

  getExpectedBalanceAmount(): number {
    return this.props.expectedBalanceAmount;
  }

  applyMovement(input: {
    readonly direction: CashMovementDirection;
    readonly amount: number;
  }): CashRegisterSession {
    if (!this.isOpen()) {
      throw new CashRegisterSessionStatusError(
        "Solo se pueden registrar movimientos sobre sesiones de caja abiertas.",
      );
    }

    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new CashManagementDomainError(
        "El movimiento manual debe tener un monto mayor a cero.",
      );
    }

    const delta = input.direction === "inbound" ? input.amount : -input.amount;
    const nextExpectedBalance = roundMonetaryAmount(
      this.props.expectedBalanceAmount + delta,
    );

    if (nextExpectedBalance < 0) {
      throw new CashManagementDomainError(
        "El movimiento dejaría la caja con saldo esperado negativo.",
      );
    }

    return new CashRegisterSession({
      ...this.props,
      expectedBalanceAmount: nextExpectedBalance,
    });
  }

  close(input: {
    readonly countedClosingAmount: number;
    readonly closeoutSubmittedAt: Date;
    readonly closeoutSubmittedByUserId: string;
    readonly closedAt: Date;
    readonly closedByUserId: string;
    readonly closingNotes?: string;
    readonly discrepancyApprovedAt?: Date;
    readonly discrepancyApprovedByUserId?: string;
    readonly discrepancyApprovalNotes?: string;
  }): CashRegisterSession {
    if (!this.isOpen()) {
      throw new CashRegisterSessionStatusError(
        "Solo se pueden cerrar sesiones de caja abiertas.",
      );
    }

    if (
      !Number.isFinite(input.countedClosingAmount) ||
      input.countedClosingAmount < 0
    ) {
      throw new CashManagementDomainError(
        "El total contado al cerrar la caja debe ser mayor o igual a cero.",
      );
    }

    if (input.closeoutSubmittedByUserId.trim().length === 0) {
      throw new CashManagementDomainError(
        "El cierre de caja debe registrar el actor que presentó el conteo.",
      );
    }

    if (input.closedByUserId.trim().length === 0) {
      throw new CashManagementDomainError(
        "El cierre de caja debe registrar el actor que lo cerró.",
      );
    }

    const countedClosingAmount = roundMonetaryAmount(input.countedClosingAmount);
    const discrepancyAmount = roundMonetaryAmount(
      countedClosingAmount - this.props.expectedBalanceAmount,
    );

    return new CashRegisterSession({
      ...this.props,
      status: "closed",
      countedClosingAmount,
      discrepancyAmount,
      closeoutSubmittedAt: input.closeoutSubmittedAt,
      closeoutSubmittedByUserId: input.closeoutSubmittedByUserId.trim(),
      closedAt: input.closedAt,
      closedByUserId: input.closedByUserId.trim(),
      discrepancyApprovedAt: input.discrepancyApprovedAt,
      discrepancyApprovedByUserId:
        input.discrepancyApprovedByUserId?.trim() || undefined,
      discrepancyApprovalNotes: input.discrepancyApprovalNotes?.trim() || undefined,
      closingNotes: input.closingNotes?.trim() || undefined,
    });
  }

  markClosingReviewRequired(input: {
    readonly countedClosingAmount: number;
    readonly closeoutSubmittedAt: Date;
    readonly closeoutSubmittedByUserId: string;
    readonly closingNotes?: string;
  }): CashRegisterSession {
    if (!this.isOpen()) {
      throw new CashRegisterSessionStatusError(
        "Solo se pueden enviar a revisión sesiones de caja abiertas.",
      );
    }

    if (
      !Number.isFinite(input.countedClosingAmount) ||
      input.countedClosingAmount < 0
    ) {
      throw new CashManagementDomainError(
        "El total contado al cerrar la caja debe ser mayor o igual a cero.",
      );
    }

    if (input.closeoutSubmittedByUserId.trim().length === 0) {
      throw new CashManagementDomainError(
        "La revisión del cierre debe registrar el actor que presentó el conteo.",
      );
    }

    const countedClosingAmount = roundMonetaryAmount(input.countedClosingAmount);
    const discrepancyAmount = roundMonetaryAmount(
      countedClosingAmount - this.props.expectedBalanceAmount,
    );

    return new CashRegisterSession({
      ...this.props,
      status: "closing_review_required",
      countedClosingAmount,
      discrepancyAmount,
      closeoutSubmittedAt: input.closeoutSubmittedAt,
      closeoutSubmittedByUserId: input.closeoutSubmittedByUserId.trim(),
      closedAt: undefined,
      closedByUserId: undefined,
      discrepancyApprovedAt: undefined,
      discrepancyApprovedByUserId: undefined,
      discrepancyApprovalNotes: undefined,
      closingNotes: input.closingNotes?.trim() || undefined,
    });
  }

  approveDiscrepancyClose(input: {
    readonly approvedAt: Date;
    readonly approvedByUserId: string;
    readonly approvalNotes?: string;
  }): CashRegisterSession {
    if (!this.isClosingReviewRequired()) {
      throw new CashRegisterSessionStatusError(
        "Solo se pueden aprobar sesiones de caja pendientes de revisión.",
      );
    }

    if (input.approvedByUserId.trim().length === 0) {
      throw new CashManagementDomainError(
        "La aprobación del cierre debe registrar el actor aprobador.",
      );
    }

    return new CashRegisterSession({
      ...this.props,
      status: "closed",
      closedAt: input.approvedAt,
      closedByUserId: input.approvedByUserId.trim(),
      discrepancyApprovedAt: input.approvedAt,
      discrepancyApprovedByUserId: input.approvedByUserId.trim(),
      discrepancyApprovalNotes: input.approvalNotes?.trim() || undefined,
    });
  }

  reopenForRecount(): CashRegisterSession {
    if (!this.isClosingReviewRequired()) {
      throw new CashRegisterSessionStatusError(
        "Solo se pueden reabrir para reconteo sesiones pendientes de revisión.",
      );
    }

    return new CashRegisterSession({
      ...this.props,
      status: "open",
      countedClosingAmount: undefined,
      discrepancyAmount: undefined,
      closeoutSubmittedAt: undefined,
      closeoutSubmittedByUserId: undefined,
      closedAt: undefined,
      closedByUserId: undefined,
      discrepancyApprovedAt: undefined,
      discrepancyApprovedByUserId: undefined,
      discrepancyApprovalNotes: undefined,
      closingNotes: undefined,
    });
  }

  toPrimitives(): CashRegisterSessionPrimitives {
    return { ...this.props };
  }
}
