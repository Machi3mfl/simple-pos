import type { ActorAccessRepository } from "@/modules/access-control/domain/repositories/ActorAccessRepository";

import type { CashRegisterSession } from "../../domain/entities/CashRegisterSession";
import { resolveActorDisplayName } from "./resolveActorDisplayName";

export interface CashRegisterSessionSummary {
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
}

export async function toCashRegisterSessionSummary(
  session: CashRegisterSession,
  actorAccessRepository: ActorAccessRepository,
): Promise<CashRegisterSessionSummary> {
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
  };
}
