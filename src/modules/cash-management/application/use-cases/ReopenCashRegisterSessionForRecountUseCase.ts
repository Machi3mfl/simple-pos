import type { ActorAccessRepository } from "@/modules/access-control/domain/repositories/ActorAccessRepository";

import {
  CashRegisterAssignmentError,
  CashRegisterSessionNotFoundError,
} from "../../domain/errors/CashManagementDomainError";
import type { CashMovementRepository } from "../../domain/repositories/CashMovementRepository";
import type { CashRegisterSessionRepository } from "../../domain/repositories/CashRegisterSessionRepository";
import {
  toCashRegisterSessionDetail,
  type CashRegisterSessionDetail,
} from "../mappers/toCashRegisterSessionDetail";

export interface ReopenCashRegisterSessionForRecountUseCaseInput {
  readonly sessionId: string;
  readonly accessibleRegisterIds?: readonly string[];
}

export class ReopenCashRegisterSessionForRecountUseCase {
  constructor(
    private readonly cashRegisterSessionRepository: CashRegisterSessionRepository,
    private readonly cashMovementRepository: CashMovementRepository,
    private readonly actorAccessRepository: ActorAccessRepository,
  ) {}

  async execute(
    input: ReopenCashRegisterSessionForRecountUseCaseInput,
  ): Promise<CashRegisterSessionDetail> {
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

    const reopenedSession = session.reopenForRecount();
    await this.cashRegisterSessionRepository.save(reopenedSession);
    const movements = await this.cashMovementRepository.listBySessionId(
      reopenedSession.getId(),
    );

    return toCashRegisterSessionDetail(
      reopenedSession,
      movements,
      this.actorAccessRepository,
    );
  }
}
