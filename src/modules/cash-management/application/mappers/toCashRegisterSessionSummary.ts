import type { ActorAccessRepository } from "@/modules/access-control/domain/repositories/ActorAccessRepository";

import type { CashRegisterSession } from "../../domain/entities/CashRegisterSession";

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
  readonly closedAt?: string;
  readonly closedByUserId?: string;
  readonly closedByDisplayName?: string;
  readonly openingNotes?: string;
  readonly closingNotes?: string;
}

async function resolveActorDisplayName(
  actorAccessRepository: ActorAccessRepository,
  actorId: string | undefined,
): Promise<string | undefined> {
  if (!actorId) {
    return undefined;
  }

  try {
    const actorAccess = await actorAccessRepository.findByUserId(actorId);
    return actorAccess?.user.getDisplayName();
  } catch {
    return undefined;
  }
}

export async function toCashRegisterSessionSummary(
  session: CashRegisterSession,
  actorAccessRepository: ActorAccessRepository,
): Promise<CashRegisterSessionSummary> {
  const primitives = session.toPrimitives();
  const openedByDisplayName =
    (await resolveActorDisplayName(actorAccessRepository, primitives.openedByUserId)) ??
    primitives.openedByUserId;
  const closedByDisplayName =
    (await resolveActorDisplayName(actorAccessRepository, primitives.closedByUserId)) ??
    primitives.closedByUserId;

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
    closedAt: primitives.closedAt?.toISOString(),
    closedByUserId: primitives.closedByUserId,
    closedByDisplayName,
    openingNotes: primitives.openingNotes,
    closingNotes: primitives.closingNotes,
  };
}
