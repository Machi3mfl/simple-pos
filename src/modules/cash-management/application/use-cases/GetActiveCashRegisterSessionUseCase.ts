import type { ActorAccessRepository } from "@/modules/access-control/domain/repositories/ActorAccessRepository";

import {
  CashRegisterAssignmentError,
  CashRegisterInactiveError,
  CashRegisterNotFoundError,
} from "../../domain/errors/CashManagementDomainError";
import type { CashMovementRepository } from "../../domain/repositories/CashMovementRepository";
import type { CashRegisterRepository } from "../../domain/repositories/CashRegisterRepository";
import type { CashRegisterSessionRepository } from "../../domain/repositories/CashRegisterSessionRepository";
import {
  toCashRegisterSessionDetail,
  type CashRegisterSessionDetail,
} from "../mappers/toCashRegisterSessionDetail";

export interface GetActiveCashRegisterSessionUseCaseInput {
  readonly cashRegisterId: string;
  readonly accessibleRegisterIds?: readonly string[];
}

export class GetActiveCashRegisterSessionUseCase {
  constructor(
    private readonly cashRegisterRepository: CashRegisterRepository,
    private readonly cashRegisterSessionRepository: CashRegisterSessionRepository,
    private readonly cashMovementRepository: CashMovementRepository,
    private readonly actorAccessRepository: ActorAccessRepository,
  ) {}

  async execute(
    input: GetActiveCashRegisterSessionUseCaseInput,
  ): Promise<CashRegisterSessionDetail | null> {
    const accessibleRegisterIds = new Set(input.accessibleRegisterIds ?? []);
    if (
      accessibleRegisterIds.size > 0 &&
      !accessibleRegisterIds.has(input.cashRegisterId)
    ) {
      throw new CashRegisterAssignmentError(input.cashRegisterId);
    }

    const register = await this.cashRegisterRepository.getById(input.cashRegisterId);
    if (!register) {
      throw new CashRegisterNotFoundError(input.cashRegisterId);
    }

    if (!register.isEnabled()) {
      throw new CashRegisterInactiveError(input.cashRegisterId);
    }

    const activeSession = await this.cashRegisterSessionRepository.findOpenByRegisterId(
      input.cashRegisterId,
    );

    if (!activeSession) {
      return null;
    }

    const movements = await this.cashMovementRepository.listBySessionId(
      activeSession.getId(),
    );

    return toCashRegisterSessionDetail(
      activeSession,
      movements,
      this.actorAccessRepository,
    );
  }
}
