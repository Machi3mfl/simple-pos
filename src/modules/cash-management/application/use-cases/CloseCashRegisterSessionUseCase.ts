import type { ActorAccessRepository } from "@/modules/access-control/domain/repositories/ActorAccessRepository";

import {
  CashRegisterAssignmentError,
  CashRegisterSessionNotFoundError,
} from "../../domain/errors/CashManagementDomainError";
import type { CashRegisterSessionRepository } from "../../domain/repositories/CashRegisterSessionRepository";
import { toCashRegisterSessionSummary, type CashRegisterSessionSummary } from "../mappers/toCashRegisterSessionSummary";

export interface CloseCashRegisterSessionUseCaseInput {
  readonly sessionId: string;
  readonly countedClosingAmount: number;
  readonly closingNotes?: string;
  readonly actorId: string;
  readonly accessibleRegisterIds?: readonly string[];
}

export class CloseCashRegisterSessionUseCase {
  constructor(
    private readonly cashRegisterSessionRepository: CashRegisterSessionRepository,
    private readonly actorAccessRepository: ActorAccessRepository,
  ) {}

  async execute(
    input: CloseCashRegisterSessionUseCaseInput,
  ): Promise<CashRegisterSessionSummary> {
    const session = await this.cashRegisterSessionRepository.findById(input.sessionId);
    if (!session) {
      throw new CashRegisterSessionNotFoundError(input.sessionId);
    }

    const accessibleRegisterIds = new Set(input.accessibleRegisterIds ?? []);
    if (
      accessibleRegisterIds.size > 0 &&
      !accessibleRegisterIds.has(session.getCashRegisterId())
    ) {
      throw new CashRegisterAssignmentError(session.getCashRegisterId());
    }

    const closedSession = session.close({
      countedClosingAmount: input.countedClosingAmount,
      closedAt: new Date(),
      closedByUserId: input.actorId,
      closingNotes: input.closingNotes,
    });

    await this.cashRegisterSessionRepository.save(closedSession);

    return toCashRegisterSessionSummary(closedSession, this.actorAccessRepository);
  }
}
