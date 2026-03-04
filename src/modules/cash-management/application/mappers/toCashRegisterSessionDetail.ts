import type { ActorAccessRepository } from "@/modules/access-control/domain/repositories/ActorAccessRepository";

import type {
  CashMovement,
  CashMovementDirection,
  CashMovementType,
} from "../../domain/entities/CashMovement";
import type { CashRegisterSession } from "../../domain/entities/CashRegisterSession";
import { resolveActorDisplayName } from "./resolveActorDisplayName";

export interface CashMovementSummary {
  readonly id: string;
  readonly movementType: CashMovementType;
  readonly direction: CashMovementDirection;
  readonly amount: number;
  readonly reasonCode?: string;
  readonly notes?: string;
  readonly saleId?: string;
  readonly debtLedgerEntryId?: string;
  readonly occurredAt: string;
  readonly performedByUserId: string;
  readonly performedByDisplayName: string;
}

export interface CashRegisterSessionDetail {
  readonly id: string;
  readonly cashRegisterId: string;
  readonly status: string;
  readonly openingFloatAmount: number;
  readonly expectedBalanceAmount: number;
  readonly countedClosingAmount?: number;
  readonly discrepancyAmount?: number;
  readonly openedAt: string;
  readonly openedByUserId: string;
  readonly openedByDisplayName: string;
  readonly closeoutSubmittedAt?: string;
  readonly closeoutSubmittedByUserId?: string;
  readonly closeoutSubmittedByDisplayName?: string;
  readonly closedAt?: string;
  readonly closedByUserId?: string;
  readonly closedByDisplayName?: string;
  readonly discrepancyApprovedAt?: string;
  readonly discrepancyApprovedByUserId?: string;
  readonly discrepancyApprovedByDisplayName?: string;
  readonly discrepancyApprovalNotes?: string;
  readonly openingNotes?: string;
  readonly closingNotes?: string;
  readonly movements: readonly CashMovementSummary[];
}

async function toCashMovementSummary(
  movement: CashMovement,
  actorAccessRepository: ActorAccessRepository,
): Promise<CashMovementSummary> {
  const primitives = movement.toPrimitives();
  const performedByDisplayName =
    (await resolveActorDisplayName(
      actorAccessRepository,
      primitives.performedByUserId,
    )) ?? primitives.performedByUserId;

  return {
    id: primitives.id,
    movementType: primitives.movementType,
    direction: primitives.direction,
    amount: primitives.amount,
    reasonCode: primitives.reasonCode,
    notes: primitives.notes,
    saleId: primitives.saleId,
    debtLedgerEntryId: primitives.debtLedgerEntryId,
    occurredAt: primitives.occurredAt.toISOString(),
    performedByUserId: primitives.performedByUserId,
    performedByDisplayName,
  };
}

export async function toCashRegisterSessionDetail(
  session: CashRegisterSession,
  movements: readonly CashMovement[],
  actorAccessRepository: ActorAccessRepository,
): Promise<CashRegisterSessionDetail> {
  const primitives = session.toPrimitives();
  const openedByDisplayName =
    (await resolveActorDisplayName(actorAccessRepository, primitives.openedByUserId)) ??
    primitives.openedByUserId;
  const closeoutSubmittedByDisplayName =
    (await resolveActorDisplayName(
      actorAccessRepository,
      primitives.closeoutSubmittedByUserId,
    )) ?? primitives.closeoutSubmittedByUserId;
  const closedByDisplayName =
    (await resolveActorDisplayName(actorAccessRepository, primitives.closedByUserId)) ??
    primitives.closedByUserId;
  const discrepancyApprovedByDisplayName =
    (await resolveActorDisplayName(
      actorAccessRepository,
      primitives.discrepancyApprovedByUserId,
    )) ?? primitives.discrepancyApprovedByUserId;

  return {
    id: primitives.id,
    cashRegisterId: primitives.cashRegisterId,
    status: primitives.status,
    openingFloatAmount: primitives.openingFloatAmount,
    expectedBalanceAmount: primitives.expectedBalanceAmount,
    countedClosingAmount: primitives.countedClosingAmount,
    discrepancyAmount: primitives.discrepancyAmount,
    openedAt: primitives.openedAt.toISOString(),
    openedByUserId: primitives.openedByUserId,
    openedByDisplayName,
    closeoutSubmittedAt: primitives.closeoutSubmittedAt?.toISOString(),
    closeoutSubmittedByUserId: primitives.closeoutSubmittedByUserId,
    closeoutSubmittedByDisplayName,
    closedAt: primitives.closedAt?.toISOString(),
    closedByUserId: primitives.closedByUserId,
    closedByDisplayName,
    discrepancyApprovedAt: primitives.discrepancyApprovedAt?.toISOString(),
    discrepancyApprovedByUserId: primitives.discrepancyApprovedByUserId,
    discrepancyApprovedByDisplayName,
    discrepancyApprovalNotes: primitives.discrepancyApprovalNotes,
    openingNotes: primitives.openingNotes,
    closingNotes: primitives.closingNotes,
    movements: await Promise.all(
      movements.map((movement) =>
        toCashMovementSummary(movement, actorAccessRepository),
      ),
    ),
  };
}
