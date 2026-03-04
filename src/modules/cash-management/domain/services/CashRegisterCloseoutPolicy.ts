import { CashManagementDomainError } from "../errors/CashManagementDomainError";

export const DEFAULT_CASH_REGISTER_DISCREPANCY_TOLERANCE_AMOUNT = 100;

function roundMonetaryAmount(amount: number): number {
  return Number(amount.toFixed(4));
}

export interface CashRegisterCloseoutDecision {
  readonly discrepancyAmount: number;
  readonly toleranceAmount: number;
  readonly isOutsideTolerance: boolean;
  readonly requiresSupervisorReview: boolean;
}

export function evaluateCashRegisterCloseoutDecision(input: {
  readonly expectedBalanceAmount: number;
  readonly countedClosingAmount: number;
  readonly discrepancyToleranceAmount?: number;
  readonly canOverrideDiscrepancy: boolean;
}): CashRegisterCloseoutDecision {
  if (
    !Number.isFinite(input.expectedBalanceAmount) ||
    input.expectedBalanceAmount < 0
  ) {
    throw new CashManagementDomainError(
      "El saldo esperado de la caja debe ser un monto válido.",
    );
  }

  if (
    !Number.isFinite(input.countedClosingAmount) ||
    input.countedClosingAmount < 0
  ) {
    throw new CashManagementDomainError(
      "El monto contado de cierre debe ser un monto válido.",
    );
  }

  const toleranceAmount = roundMonetaryAmount(
    input.discrepancyToleranceAmount ??
      DEFAULT_CASH_REGISTER_DISCREPANCY_TOLERANCE_AMOUNT,
  );

  if (!Number.isFinite(toleranceAmount) || toleranceAmount < 0) {
    throw new CashManagementDomainError(
      "La tolerancia de cierre de caja debe ser mayor o igual a cero.",
    );
  }

  const discrepancyAmount = roundMonetaryAmount(
    input.countedClosingAmount - input.expectedBalanceAmount,
  );
  const isOutsideTolerance = Math.abs(discrepancyAmount) > toleranceAmount;

  return {
    discrepancyAmount,
    toleranceAmount,
    isOutsideTolerance,
    requiresSupervisorReview:
      isOutsideTolerance && !input.canOverrideDiscrepancy,
  };
}
