import type { DebtLedgerEntry } from "../entities/DebtLedgerEntry";

export interface OrderDebtSnapshot {
  readonly orderId: string;
  readonly debtAmount: number;
  readonly paidAmount: number;
  readonly outstandingAmount: number;
}

interface OrderDebtDraft {
  debtAmount: number;
  paidAmount: number;
}

interface OutstandingSlice {
  readonly orderId: string;
  remainingAmount: number;
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function ensureOrderDraft(
  orderDraftById: Map<string, OrderDebtDraft>,
  orderId: string,
): OrderDebtDraft {
  const existing = orderDraftById.get(orderId);
  if (existing) {
    return existing;
  }

  const created: OrderDebtDraft = {
    debtAmount: 0,
    paidAmount: 0,
  };
  orderDraftById.set(orderId, created);
  return created;
}

function applyPaymentToSlices(
  outstandingSlices: OutstandingSlice[],
  orderDraftById: Map<string, OrderDebtDraft>,
  amount: number,
  targetOrderId?: string,
): number {
  let remainingAmount = amount;

  for (const slice of outstandingSlices) {
    if (remainingAmount <= 0) {
      break;
    }

    if (slice.remainingAmount <= 0) {
      continue;
    }

    if (targetOrderId && slice.orderId !== targetOrderId) {
      continue;
    }

    const appliedAmount = Math.min(slice.remainingAmount, remainingAmount);
    if (appliedAmount <= 0) {
      continue;
    }

    slice.remainingAmount = roundMoney(slice.remainingAmount - appliedAmount);
    const draft = ensureOrderDraft(orderDraftById, slice.orderId);
    draft.paidAmount = roundMoney(draft.paidAmount + appliedAmount);
    remainingAmount = roundMoney(remainingAmount - appliedAmount);
  }

  return remainingAmount;
}

export function summarizeDebtByOrder(
  entries: readonly DebtLedgerEntry[],
): ReadonlyMap<string, OrderDebtSnapshot> {
  const sortedEntries = [...entries].sort((left, right) => {
    const timeDifference =
      left.getOccurredAt().getTime() - right.getOccurredAt().getTime();
    if (timeDifference !== 0) {
      return timeDifference;
    }

    const leftType = left.toPrimitives().entryType;
    const rightType = right.toPrimitives().entryType;
    if (leftType === rightType) {
      return 0;
    }

    return leftType === "debt" ? -1 : 1;
  });

  const orderDraftById = new Map<string, OrderDebtDraft>();
  const outstandingSlices: OutstandingSlice[] = [];

  for (const entry of sortedEntries) {
    const primitive = entry.toPrimitives();

    if (primitive.entryType === "debt") {
      if (!primitive.orderId) {
        throw new Error("Debt entry requires orderId.");
      }

      const draft = ensureOrderDraft(orderDraftById, primitive.orderId);
      draft.debtAmount = roundMoney(draft.debtAmount + primitive.amount);
      outstandingSlices.push({
        orderId: primitive.orderId,
        remainingAmount: primitive.amount,
      });
      continue;
    }

    const remainingAmount = primitive.orderId
      ? applyPaymentToSlices(
          outstandingSlices,
          orderDraftById,
          primitive.amount,
          primitive.orderId,
        )
      : applyPaymentToSlices(outstandingSlices, orderDraftById, primitive.amount);

    if (remainingAmount > 0) {
      throw new Error("Debt payment allocation exceeds outstanding debt.");
    }
  }

  return new Map<string, OrderDebtSnapshot>(
    Array.from(orderDraftById.entries()).map(([orderId, draft]) => {
      const outstandingAmount = roundMoney(draft.debtAmount - draft.paidAmount);

      return [
        orderId,
        {
          orderId,
          debtAmount: draft.debtAmount,
          paidAmount: draft.paidAmount,
          outstandingAmount,
        },
      ];
    }),
  );
}
